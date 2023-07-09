
export interface IStorageHandler {
    name(): string;
    getAvailableRegions(): StorageRegionInfo[];
    getBlobUploadUrl(region: string, account: string, blobName: string, expiryDate: Date): Promise<string>;
    getBlobDownloadUrl(region: string, account: string, blobName: string, expiryDate: Date, originalName: string): Promise<string>;
}

export interface StorageHandlerInfo {
    name: string;
    availableRegions: StorageRegionInfo[];
}

export interface StorageRegionInfo {
    id: string;
    name: string;
    pingUrl: string;
}