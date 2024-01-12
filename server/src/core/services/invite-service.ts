import { Collection } from "mongodb";
import { NamedResource, UserInviteWithSender, RecipientInvite ,UserInvite, createPersistedModel, RoleType, User } from "../models.js";
import { rethrowIfAppError, createAppError, createSubscriptionRequiredError, createResourceNotFoundError } from "../error.js";
import { EmailHandler, createDeclineGenericInviteEmail, createDeclineProjectInviteEmail, createGenericInviteEmail, createProjectInviteEmail } from "./index.js";
import { Database, DbUserInvite } from "../db.js";
import { generateId } from "../utils.js";

const DEFAULT_VALIDITY_MILLIS = 2 * 24 * 60 * 60 * 1000; // 2 days

export interface InviteServiceConfig {
    emails: EmailHandler;
    webappBaseUrl: string;
};

function getSafeInvite(dbInvite: DbUserInvite): UserInvite {
    const { secret, ...invite } = dbInvite;
    return invite;
}

export class InviteService {
    private collection: Collection<DbUserInvite>;

    constructor(private db: Database, private config: InviteServiceConfig) {
        this.collection = db.invites();
    }

    async createInvite(args: CreateInviteArgs): Promise<void> {
        try {
            // TODO: handle if inviting existing user (whether full or guest)
            const now = Date.now();
            const expiresAt = new Date(now + DEFAULT_VALIDITY_MILLIS);
            const dbInvite: DbUserInvite = {
                ...createPersistedModel(args.invitor._id),
                name: args.name,
                email: args.email,
                message: args.message,
                resource: {
                    id: args.resource.id,
                    name: args.resource.name,
                    type: args.resource.type
                },
                role: args.role,
                expiresAt,
                secret: generateId()
            };

            const publicInvite = getSafeInvite(dbInvite);

            const message = args.resource.type === 'project' ?
                createProjectInviteEmail(args.invitor.name, publicInvite, dbInvite.secret, this.config.webappBaseUrl) :
                createGenericInviteEmail(args.invitor.name, dbInvite.secret, args.name || '', this.config.webappBaseUrl);
            
            const subject = args.resource.type === 'project' ?
                `Quickbyte: ${args.invitor.name} invited you to project ${publicInvite.resource.name}` :
                `${args.invitor.name} invited you to collaborate on Quickbyte`;

            await this.config.emails.sendEmail({
                to: { name: args.name, email: args.email },
                message,
                subject: subject
            });

            await this.collection.insertOne(dbInvite);
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async verifyInvite(code: string): Promise<UserInviteWithSender> {
        try {
            const [invite] = await this.collection.aggregate<UserInviteWithSender>([
                {
                    $match: {
                        secret: code,
                        expiresAt: { $gt: new Date() }
                    }
                },
                {
                    $lookup: {
                        from: this.db.users().collectionName,
                        foreignField: '_id',
                        localField: '_createdBy._id',
                        as: 'sender',
                        pipeline: [{
                            $project: {
                                _id: 0,
                                name: 1,
                                email: 1
                            }
                        }]
                    }
                },
                {
                    $unwind: {
                        path: '$sender'
                    }
                },
                {
                    $project: {
                        secret: 0
                    }
                }
            ]).toArray();

            if (!invite) {
                throw createResourceNotFoundError('The invite does not exist.');
            }

            return invite;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async declineInvite(id: string, email: string): Promise<void> {
        try {
            const [invite] = await this.collection.aggregate<UserInvite & { sender: User }>([
                {
                    $match: {
                        _id: id,
                        email: email,
                        expiresAt: { $gt: new Date() }
                    }
                },
                {
                    $lookup: {
                        from: this.db.users().collectionName,
                        foreignField: '_id',
                        localField: '_createdBy._id',
                        as: 'sender'
                    }
                },
                {
                    $unwind: { path: '$sender' }
                }
            ]).toArray();

            if (!invite) {
                throw createResourceNotFoundError('The invite does not exist.');
            }

            await this.collection.deleteOne({ _id: invite._id });

            const subject = invite.name ?
                `${invite.name} has declined your invitation to collaborate.`:
                `A request for collaboration has been declined.`
            
            const message = invite.resource.type === 'project'?
                createDeclineProjectInviteEmail(invite.sender.name, invite) :
                createDeclineGenericInviteEmail(invite.sender.name, invite);

            await this.config.emails.sendEmail({
                to: {
                    name: invite.sender.name,
                    email: invite.sender.email,
                },
                subject,
                message
            });
            
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async deleteInvite(id: string): Promise<void> {
        try {
            await this.collection.deleteOne({ _id: id });
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getByRecipientEmail(email: string): Promise<RecipientInvite[]> {
        try {
            // this invite result contains the secret invite code
            // because it's meant to be sent to the recipient's account.
            // The recipient needs the code to accept the invite.
            const invites = await this.collection.aggregate<RecipientInvite>([
                {
                    $match: { 
                        email,
                        expiresAt: { $gt: new Date() }
                    },
                },
                {
                    $lookup: {
                        from: this.db.users().collectionName,
                        localField: '_createdBy._id',
                        foreignField: '_id',
                        as: 'sender',
                        pipeline: [
                            {
                                $project:  {
                                    name: 1,
                                    email: 1,
                                    _id: 0
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: '$sender'
                    }
                }
            ]).toArray();

            return invites;
        } catch(e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type IInviteService = Pick<InviteService, 'deleteInvite'|'createInvite'|'declineInvite'|'verifyInvite'|'getByRecipientEmail'>;

export interface CreateInviteArgs {
    email: string;
    name?: string;
    message?: string;
    resource: NamedResource;
    invitor: User;
    role: RoleType;
}
