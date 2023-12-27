import { Db, Collection, UpdateFilter } from "mongodb";
import { NamedResource, UserInvite, createPersistedModel, RoleType, User } from "../models.js";
import { rethrowIfAppError, createAppError, createSubscriptionRequiredError, createResourceNotFoundError } from "../error.js";
import { EmailHandler, createGenericInviteEmail, createProjectInviteEmail } from "./index.js";

const COLLECTION = 'invites';
const DEFAULT_VALIDITY_MILLIS = 2 * 24 * 60 * 60 * 1000; // 2 days

export interface InviteServiceConfig {
    emails: EmailHandler;
    webappBaseUrl: string;
};

export class InviteService {
    private collection: Collection<UserInvite>;

    constructor(private db: Db, private config: InviteServiceConfig) {
        this.collection = db.collection(COLLECTION);
    }

    async createInvite(args: CreateInviteArgs) {
        try {
            // TODO: handle if inviting existing user (whether full or guest)
            const now = Date.now();
            const expiresAt = new Date(now + DEFAULT_VALIDITY_MILLIS);
            const invite: UserInvite = {
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
                expiresAt
            };

            const message = args.resource.type === 'project' ?
                createProjectInviteEmail(args.invitor.name, invite, this.config.webappBaseUrl) :
                createGenericInviteEmail(args.invitor.name, invite._id, args.name || '', this.config.webappBaseUrl);
            
            const subject = args.resource.type === 'project' ?
                `Quickbyte: ${args.invitor.name} invited you to project ${invite.resource.name}` :
                `${args.invitor.name} invited you to collaborate on Quickbyte`;

            await this.config.emails.sendEmail({
                to: { name: args.name, email: args.email },
                message,
                subject: subject
            });

            await this.collection.insertOne(invite);
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async verifyInvite(id: string, email: string): Promise<UserInvite> {
        try {
            const invite = await this.collection.findOne({
                _id: id,
                email: email,
                expiresAt: { $gt: new Date() }
            });

            if (!invite) {
                throw createResourceNotFoundError();
            }

            return invite;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type IInviteService = Pick<InviteService, 'createInvite'|'verifyInvite'>;

export interface CreateInviteArgs {
    email: string;
    name?: string;
    message?: string;
    resource: NamedResource;
    invitor: User;
    role: RoleType;
}