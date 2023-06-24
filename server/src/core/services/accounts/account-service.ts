import { FileService, IFileService, IStorageHandlerProvider } from "../index.js";

export class AccountService {
    constructor(private storageProvider: IStorageHandlerProvider) {
    }

    files(accountId: string): IFileService {
        return new FileService(accountId, this.storageProvider);
    }
}