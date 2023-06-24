import { Db, Collection } from "mongodb";
import { Account, createAppError, createDbError, createPersistedModel, FileService, IFileService, isMongoDuplicateKeyError, IStorageHandlerProvider, rethrowIfAppError } from "../../index.js";
import { generateId } from '../../utils.js';

const COLLECTION = 'accounts';

export class AccountService {
    private collection: Collection<Account>;

    constructor(private db: Db, private storageProvider: IStorageHandlerProvider) {
        this.collection = this.db.collection(COLLECTION);
    }

    async create(ownerId: string): Promise<Account> {
        const account: Account = {
            ...createPersistedModel(ownerId),
            owner: {
                type: 'user',
                _id: ownerId
            }
        }

        try {
            await this.collection.insertOne(account);
            return account;
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