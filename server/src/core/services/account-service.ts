import { Db, Collection } from "mongodb";
import { Account, createAppError, createDbError, createPersistedModel, FileService, IFileService, isMongoDuplicateKeyError, IStorageHandlerProvider, Principal, rethrowIfAppError } from "../index.js";
import { generateId } from '../utils.js';

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


    files(accountId: string): IFileService {
        return new FileService(accountId, this.storageProvider);
    }
}

export type IAccountService = Pick<AccountService, 'getOrCreateByOwner' | 'files'>;
