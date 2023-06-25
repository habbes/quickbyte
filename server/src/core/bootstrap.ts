import { MongoClient } from "mongodb";
import { AppConfig } from "./config.js";
import { createAppError } from "./error.js";
import {
    AzureStorageHandler,
    IStorageHandlerProvider,
    StorageHandlerProvider,
    AccountService,
    IAuthService,
    AuthService,
    IAccountService
} from "./services/index.js";

export async function bootstrapApp(config: AppConfig): Promise<AppServices> {
    const db = await getDbConnection(config);

    const azureStorageHandler = new AzureStorageHandler(
        config.azureStorageConnectionString,
        config.azureStorageContainer
    );

    const storageProvider = new StorageHandlerProvider();
    storageProvider.registerHandler(azureStorageHandler);

    const accounts = new AccountService(db, storageProvider);
    const auth = new AuthService(db, {
        aadClientId: config.aadClientId,
        aadClientSecret: config.aadClientSecret,
        aadTenantId: config.aadTenantId,
        accounts
    });

    return {
        storageProvider,
        accounts,
        auth
    };
}

export interface AppServices {
    storageProvider: IStorageHandlerProvider,
    accounts: IAccountService,
    auth: IAuthService,
}

async function getDbConnection(config: AppConfig) {
    try {
        const client = await MongoClient.connect(config.dbUrl);
        return client.db(config.dbName);
    } catch (e: any) {
        throw createAppError(`Database connection error: ${e.message}`, 'dbError');
    }
}