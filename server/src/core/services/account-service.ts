import { Db, Collection } from "mongodb";
import { Account, AuthContext, createAppError, createDbError, createPersistedModel, FileService, IFileService, IPaymentHandlerProvider, IPlanService, isMongoDuplicateKeyError, IStorageHandlerProvider, ITransactionService, ITransferService, Principal, rethrowIfAppError, TransactionService, TransferService } from "../index.js";

const COLLECTION = 'accounts';

export interface AccountServiceConfig {
    storageHandlers: IStorageHandlerProvider;
    plans: IPlanService;
    paymentHandlers: IPaymentHandlerProvider;
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


    files(authContext: AuthContext): IFileService {
        return new FileService(this.db, authContext, this.config.storageHandlers);
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
}

export type IAccountService = Pick<AccountService, 'getOrCreateByOwner' | 'files' | 'transfers' | 'transactions'>;
