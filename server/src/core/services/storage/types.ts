
export interface IStorageHandler {
    name(): string;
    getAvailableRegions(): string[];
    getBlobUploadUrl(region: string, account: string, blobName: string, expiryDate: Date): Promise<string>;
    getBlobDownloadUrl(region: string, account: string, blobName: string, expiryDate: Date, originalName: string): Promise<string>;
}

export interface StorageHandlerInfo {
    name: string;
    availableRegions: string[];
}