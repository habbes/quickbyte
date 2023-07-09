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
    IAccountService,
    IDownloadService,
    DownloadService
} from "./services/index.js";

export async function bootstrapApp(config: AppConfig): Promise<AppServices> {
    const db = await getDbConnection(config);

    const azureStorageHandler = new AzureStorageHandler({
        tenantId: config.azTenantId,
        clientId: config.azClientId,
        clientSecret: config.azClientSecret,
        resourcePrefix: config.azResourcePrefix,
        availableRegionCodes: config.azStorageRegionCodes,
        legacyAccountConnectionString: config.legacyAzStorageConnectionString,
        legacyAccountContainer: config.legacyAzStorageContainer,
        legacyPingContainer: config.legacyAzStoragePingContainer,
        legacyPingBlob: config.legacyAzStoragePingBlob,
        keyVaultUri: config.azKeyVaultUri,
        dataContainer: config.azDataContainer,
        pingContainer: config.azPingContainer,
        pingBlob: config.azPingBlob
    });

    await azureStorageHandler.initialize();

    const storageProvider = new StorageHandlerProvider();
    storageProvider.registerHandler(azureStorageHandler);

    const accounts = new AccountService(db, storageProvider);
    const auth = new AuthService(db, {
        aadClientId: config.aadClientId,
        aadClientSecret: config.aadClientSecret,
        aadTenantId: config.aadTenantId,
        accounts
    });

    const downloads = new DownloadService(db);

    return {
        storageProvider,
        accounts,
        auth,
        downloads
    };
}

export interface AppServices {
    storageProvider: IStorageHandlerProvider,
    accounts: IAccountService,
    auth: IAuthService,
    downloads: IDownloadService,
}

async function getDbConnection(config: AppConfig) {
    try {
        const client = await MongoClient.connect(config.dbUrl);
        return client.db(config.dbName);
    } catch (e: any) {
        throw createAppError(`Database connection error: ${e.message}`, 'dbError');
    }
}