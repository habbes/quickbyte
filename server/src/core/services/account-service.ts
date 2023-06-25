import { Db, Collection } from "mongodb";
import { Account, AuthContext, createAppError, createDbError, createPersistedModel, FileService, IFileService, isMongoDuplicateKeyError, IStorageHandlerProvider, Principal, rethrowIfAppError } from "../index.js";

const COLLECTION = 'accounts';

export class AccountService {
    private collection: Collection<Account>;

    constructor(private db: Db, private storageProvider: IStorageHandlerProvider) {
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
        return new FileService(this.db, authContext, this.storageProvider);
    }
}

export type IAccountService = Pick<AccountService, 'getOrCreateByOwner' | 'files'>;
