import { AppConfig } from "./config.js";
import { AzureStorageHandler, IStorageHandlerProvider, StorageHandlerProvider, FileService, IFileService, AccountService } from "./services/index.js";

export async function bootstrapApp(config: AppConfig): Promise<AppServices> {
    const azureStorageHandler = new AzureStorageHandler(
        config.azureStorageConnectionString,
        config.azureStorageContainer
        );
    
    const storageProvider = new StorageHandlerProvider();
    storageProvider.registerHandler(azureStorageHandler);

    const accounts = new AccountService(storageProvider);

    return {
        storageProvider,
        accounts,
    };
}

export interface AppServices {
    storageProvider: IStorageHandlerProvider,
    accounts: AccountService,
}