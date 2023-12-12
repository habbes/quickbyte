import { Db, Collection } from "mongodb";
import { Account, AuthContext, createAppError, createDbError, createPersistedModel, createResourceNotFoundError, EmailHandler, IPaymentHandlerProvider, IPlanService, isMongoDuplicateKeyError, IStorageHandlerProvider, ITransactionService, ITransferService, Principal, rethrowIfAppError, TransactionService, TransferService } from "../index.js";
import { IProjectService, ProjectService } from "./project-service.js";
import { IInviteService, InviteService } from "./invite-service.js";
import { MediaService } from "./media-service.js";
import { CommentService } from "./comment-service.js";

const COLLECTION = 'accounts';

export interface AccountServiceConfig {
    storageHandlers: IStorageHandlerProvider;
    plans: IPlanService;
    paymentHandlers: IPaymentHandlerProvider;
    emailHandler: EmailHandler;
    webappBaseUrl: string;
    invites: IInviteService;
}

export class AccountService {
    private collection: Collection<Account>;

    constructor(private db: Db, private config: AccountServiceConfig) {
        this.collection = this.db.collection<Account>(COLLECTION);
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
        return new TransferService(this.db, authContext, {
            providerRegistry: this.config.storageHandlers,
            transactions: this.transactions(authContext)
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
        return new ProjectService(this.db, authContext, {
            transactions: this.transactions(authContext),
            invites: this.config.invites,
            transfers,
            media: new MediaService(this.db, authContext, {
                transfers,
                comments: new CommentService(this.db, authContext)
            })
        });
    }
}

export type IAccountService = Pick<AccountService, 'getOrCreateByOwner' | 'getById' | 'transfers' | 'transactions' | 'projects'>;
