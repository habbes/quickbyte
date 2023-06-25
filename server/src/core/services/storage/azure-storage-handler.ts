import { BlobSASPermissions, BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { IStorageHandler } from "./types.js";

export class AzureStorageHandler implements IStorageHandler {
    private client: BlobServiceClient;
    private container: ContainerClient;

    constructor(connectionString: string, container: string) {
        // TODO: get storage account client based on region
        this.client = BlobServiceClient.fromConnectionString(connectionString);
        this.container = this.client.getContainerClient(container);
    }

    name(): string {
        return 'az';
    }

    getAvailableRegions(): string[] {
        return ['sa-north'];
    }

    async getBlobUploadUrl(region: string, account: string, blobName: string, expiryDate: Date): Promise<string> {
        // TODO: get storage account client based on region
        const blobPath = `${account}/${blobName}`;
        const blob = this.container.getBlobClient(blobPath);
        const url = await blob.generateSasUrl({
            permissions: BlobSASPermissions.from({ write: true, create: true }),
            expiresOn: expiryDate
        });

        return url;
    }

    async getBlobDownloadUrl(region: string, account: string, blobName: string, expiryDate: Date): Promise<string> {
        // TODO: get storage account client based on region
        const blobPath = `${account}/${blobName}`;
        const blob = this.container.getBlobClient(blobPath);
        // TODO: should we verify that blob exists?
        const url = await blob.generateSasUrl({
            permissions: BlobSASPermissions.from({ read: true }),
            expiresOn: expiryDate
        });
        return url;
    }
}
