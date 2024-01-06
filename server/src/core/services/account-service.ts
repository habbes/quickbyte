import { Collection } from "mongodb";
import { Account, AuthContext, createAppError, createDbError, createPersistedModel, createResourceNotFoundError, EmailHandler, IPaymentHandlerProvider, IPlanService, isMongoDuplicateKeyError, IStorageHandlerProvider, ITransactionService, ITransferService, Principal, rethrowIfAppError, TransactionService, TransferService, Project, BasicUserData, WithRole } from "../index.js";
import { IProjectService, ProjectService } from "./project-service.js";
import { IInviteService, InviteService } from "./invite-service.js";
import { MediaService } from "./media-service.js";
import { CommentService } from "./comment-service.js";
import { IAccessHandler } from "./access-handler.js";
import { Database } from "../db.js";

export interface AccountServiceConfig {
    storageHandlers: IStorageHandlerProvider;
    plans: IPlanService;
    paymentHandlers: IPaymentHandlerProvider;
    emailHandler: EmailHandler;
    webappBaseUrl: string;
    invites: IInviteService;
    access: IAccessHandler;
}

export class AccountService {
    private collection: Collection<Account>;

    constructor(private db: Database, private config: AccountServiceConfig) {
        this.collection = this.db.accounts();
    }

    async getOrCreateByOwner(ownerId: string): Promise<Account> {
        const owner: Principal = {
            type: "user",
            _id: ownerId
        };

        try {
            const account = await this.collection.findOne({ owner });
            if (account) {
                return account;
            };

            const newAccount: Account = {
                ...createPersistedModel(ownerId),
                owner: {
                    type: 'user',
                    _id: ownerId
                }
            };

            await this.collection.insertOne(newAccount);
            return newAccount;
        } catch (e: any) {
            rethrowIfAppError(e);
            if (isMongoDuplicateKeyError(e)) {
                throw createAppError(e.message, 'resourceConflict');
            }

            throw createDbError(e);
        }
    }

    async getById(id: string): Promise<Account> {
        try {
            const account = await this.collection.findOne({ _id: id });
            if (!account) {
                throw createResourceNotFoundError('Account not found.');
            }

            return account;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    transfers(authContext: AuthContext): ITransferService {
        return new TransferService(this.db.db, authContext, {
            providerRegistry: this.config.storageHandlers,
            transactions: this.transactions(authContext)
        });
    }

    transactions(authContext: AuthContext): ITransactionService {
        return new TransactionService(this.db.db, authContext, {
            plans: this.config.plans,
            paymentHandlers: this.config.paymentHandlers
        });
    }

    projects(authContext: AuthContext): IProjectService {
        const transfers = this.transfers(authContext);
        return new ProjectService(this.db, authContext, {
            transactions: this.transactions(authContext),
            invites: this.config.invites,
            transfers,
            access: this.config.access,
            media: new MediaService(this.db.db, authContext, {
                transfers,
                comments: new CommentService(this.db.db, authContext)
            })
        });
    }

    async getUserData(authContext: AuthContext): Promise<BasicUserData> {
        try {
            const ownedProjectsTask = this.db.projects().aggregate<WithRole<Project>>([
                { $match: { '_createdBy._id': authContext.user._id } },
                { $addFields: { role: 'owner'} }
            ]).toArray();
            const otherProjectsTask = this.db.roles().aggregate<WithRole<Project>>([
                {
                    $match: {
                        userId: authContext.user._id,
                        resourceType: 'project'
                    }
                },
                {
                    $lookup: {
                        from: this.db.projects().collectionName,
                        localField: 'resourceId',
                        foreignField: '_id',
                        as: 'project'
                    }
                },
                // flatten the "project" property
                {
                    $unwind: { path: '$project' }
                },
                // Merge the project fields to the root
                // of the document, together with the role field
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                '$$ROOT',
                                '$project'
                            ]
                        }
                    }
                },
                // Remove unwanted fields,
                // After this each document
                // should be a project with
                // an additional "role" field
                {
                    $project: {
                        resourceId: 0,
                        resourceType: 0,
                        projectId: 0
                    }
                }
            ]).toArray();

            const [ownedProjects, otherProjects] = await Promise.all([ownedProjectsTask, otherProjectsTask]);
            const projects = ownedProjects.concat(otherProjects);
            // get other accounts
            const accountIds = new Set<string>();
            accountIds.add(authContext.user.account._id);
            projects.forEach(p => accountIds.add(p.accountId));
            const invites = await this.config.invites.getByRecipientEmail(authContext.user.email);

            const accounts = await this.db.accounts().find({ _id: { $in: Array.from(accountIds) }}).toArray();

            return {
                user: authContext.user,
                accounts,
                projects,
                defaultAccountId: authContext.user.account._id,
                defaultProjectId: projects[0]?._id,
                invites
            }
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type IAccountService = Pick<AccountService, 'getOrCreateByOwner' | 'getById' | 'transfers' | 'transactions' | 'projects' | 'getUserData'>;
