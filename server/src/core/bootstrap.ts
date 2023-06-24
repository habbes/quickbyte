import { MongoClient } from "mongodb";
import { AppConfig } from "./config.js";
import { createAppError } from "./error.js";
import { AzureStorageHandler, IStorageHandlerProvider, StorageHandlerProvider, FileService, IFileService, AccountService } from "./services/index.js";

export async function bootstrapApp(config: AppConfig): Promise<AppServices> {
    const db = await getDbConnection(config);

    const azureStorageHandler = new AzureStorageHandler(
        config.azureStorageConnectionString,
        config.azureStorageContainer
        );
    
    const storageProvider = new StorageHandlerProvider();
    storageProvider.registerHandler(azureStorageHandler);

    const accounts = new AccountService(db, storageProvider);

    return {
        storageProvider,
        accounts,
    };
}

export interface AppServices {
    storageProvider: IStorageHandlerProvider,
    accounts: AccountService,
}

async function getDbConnection(config: AppConfig) {
    try {
        const client = await MongoClient.connect(config.dbUrl);
        return client.db(config.dbName);
    } catch (e: any) {
        throw createAppError(`Database connection error: ${e.message}`, 'dbError');
    }
}