import { Collection } from "mongodb";
import { Account, AuthContext, createAppError, createDbError, createPersistedModel, createResourceNotFoundError, EmailHandler, IPaymentHandlerProvider, IPlanService, isMongoDuplicateKeyError, IStorageHandlerProvider, ITransactionService, ITransferService, Principal, rethrowIfAppError, TransactionService, TransferService, Project, BasicUserData, WithRole, createInvalidAppStateError, AccountWithSubscription, IPlaybackPackagerProvider, ProjectShareService } from "../index.js";
import { IProjectService, ProjectService } from "./project-service.js";
import { IInviteService } from "./invite-service.js";
import { MediaService } from "./media-service.js";
import { CommentService } from "./comment-service.js";
import { IAccessHandler } from "./access-handler.js";
import { Database, DbAccount } from "../db.js";
import { EventDispatcher } from "./event-bus/index.js";
import { FolderService } from "./folder-service.js";
import { LinkGenerator } from '@quickbyte/common';

export interface AccountServiceConfig {
    storageHandlers: IStorageHandlerProvider;
    plans: IPlanService;
    paymentHandlers: IPaymentHandlerProvider;
    emailHandler: EmailHandler;
    webappBaseUrl: string;
    invites: IInviteService;
    access: IAccessHandler;
    links: LinkGenerator;
    eventBus: EventDispatcher;
    playbackPackagers: IPlaybackPackagerProvider;
}

export class AccountService {
    private collection: Collection<DbAccount>;

    constructor(private db: Database, private config: AccountServiceConfig) {
        this.collection = this.db.accounts();
    }

    async getOrCreateByOwner(ownerId: string): Promise<Account> {
        const owner: Principal = {
            type: "user",
            _id: ownerId
        };

        try {
            const [account] = await this.collection.aggregate<Account>([
                {
                    $match: { owner }
                },
                {
                    $lookup: {
                        from: this.db.users().collectionName,
                        foreignField: '_id',
                        localField: 'owner._id',
                        pipeline: [
                            {
                                $project: { name: 1 }
                            }
                        ],
                        as: 'user'
                    }
                },
                {
                    $unwind: {
                        path: '$user'
                    }
                },
                {
                    $addFields: {
                        name: { $concat: ['$user.name', "'s Account"]}
                    }
                },
                {
                    $project: {
                        user: 0
                    }
                }
            ]).toArray();
            if (account) {
                return account;
            };

            const newAccount: DbAccount = {
                ...createPersistedModel(ownerId),
                owner: {
                    type: 'user',
                    _id: ownerId
                }
            };

            await this.collection.insertOne(newAccount);
            // TODO: we should remove this once we add account to owners
            const user = await this.db.users().findOne({ _id: owner._id });
            if (!user) {
                throw createInvalidAppStateError(`Expected owner '${owner._id}' for new account '${newAccount._id}' to exist.`)
            }

            return { ...newAccount, name: `${user.name}'s Account` };
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
            const [account] = await this.tryGetByIdsInternal([id]);

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

    private async tryGetByIdsInternal(ids: string[]): Promise<AccountWithSubscription[]> {
        try {
            const now = new Date();
            const accounts = await this.collection.aggregate<AccountWithSubscription>([
                {
                    $match: { _id: { $in: ids } }
                },
                {
                    $lookup: {
                        from: this.db.subscriptions().collectionName,
                        localField: '_id',
                        foreignField: 'accountId',
                        as: 'subscription',
                        pipeline: [
                            {
                                $match: {
                                    expiresAt: { $gt: now },
                                    validFrom : { $lte: now },
                                    status: 'active'
                                }
                            },
                            {
                                $limit: 1
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: '$subscription',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: this.db.users().collectionName,
                        foreignField: '_id',
                        localField: 'owner._id',
                        pipeline: [
                            {
                                $project: { name: 1 }
                            }
                        ],
                        as: 'user'
                    }
                },
                {
                    $unwind: {
                        path: '$user'
                    }
                },
                {
                    $addFields: {
                        name: { $concat: ['$user.name', "'s Account"]}
                    }
                },
                {
                    $project: {
                        user: 0
                    }
                }
            ]).toArray();
    
            for (let account of accounts) {
                if (!account.subscription) break;

                account.subscription.plan = await this.config.plans.getByName(account.subscription.planName);
            }

            return accounts;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    transfers(authContext: AuthContext): ITransferService {
        return new TransferService(this.db, authContext, {
            eventBus: this.config.eventBus,
            providerRegistry: this.config.storageHandlers,
            transactions: this.transactions(authContext),
            packagers: this.config.playbackPackagers
        });
    }

    transactions(authContext: AuthContext): ITransactionService {
        return new TransactionService(this.db, authContext, {
            plans: this.config.plans,
            paymentHandlers: this.config.paymentHandlers
        });
    }

    projects(authContext: AuthContext): IProjectService {
        const transfers = this.transfers(authContext);
        const folders = new FolderService(this.db, authContext);
        return new ProjectService(this.db, authContext, {
            transactions: this.transactions(authContext),
            invites: this.config.invites,
            transfers,
            access: this.config.access,
            email: this.config.emailHandler,
            links: this.config.links,
            folders,
            eventBus: this.config.eventBus,
            media: new MediaService(this.db, authContext, {
                transfers,
                comments: new CommentService(this.db, authContext),
                folders
            }),
            projectShares: new ProjectShareService(this.db, authContext, {
                events: this.config.eventBus
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
            const externalAccountIds = new Set<string>();
            projects.forEach(p => externalAccountIds.add(p.accountId));
            // remove the user's own account to avoid fetching it twice since
            // it's already part of the auth context
            externalAccountIds.delete(authContext.user.account._id);

            const accounts = [authContext.user.account, ...await this.tryGetByIdsInternal(Array.from(externalAccountIds))];

            const invites = await this.config.invites.getByRecipientEmail(authContext.user.email);
            

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
