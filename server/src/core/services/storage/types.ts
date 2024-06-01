
export interface IStorageHandler {
    name(): string;
    getAvailableRegions(): StorageRegionInfo[];
    getBlobUploadUrl(region: string, account: string, blobName: string, expiryDate: Date): Promise<string>;
    getBlobDownloadUrl(region: string, account: string, blobName: string, expiryDate: Date, originalName: string): Promise<string>;
    initBlobUpload(region: string, account: string, blobName: string, size: number, blockSize: number): Promise<any>;
    completeBlobUpload(region: string, account: string, blobName: string, providerArgs: any): Promise<any>;
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