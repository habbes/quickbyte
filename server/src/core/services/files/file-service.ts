import { BlobSASPermissions, BlobServiceClient } from '@azure/storage-blob';

export class FileService {
    constructor(private accountId: string) {}

    async initFileUpload(args: InitFileUploadArgs): Promise<InitFileUploadResult> {
        // overall plan:
        // when client wants to transfer a file:
        // - client pings regions in available provider to find provider/region with optimal latency
        // - client sends request to server to initiate file upload, payload includes filename and other metadata
        // also includes preferred provider and region
        // - server creates blob in provider/region under the user's account, blob has unique path
        // - server stores file and blob metadata in db
        // - server generates secure upload url and sends response to client
        // - client uses secure upload URL to upload blocks of the blob
        // - client will send update to server when upload is done
        // - client could send periodic updates to server on upload progress
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
        const client = BlobServiceClient.fromConnectionString(connectionString);
        const container = client.getContainerClient('container');
        const blobName = `${this.accountId}generateId`;
        const blob = container.getBlobClient(blobName);
        const url = await blob.generateSasUrl({
            permissions: BlobSASPermissions.from({ write: true, create: true }),
            expiresOn: new Date() // TODO: date in future, maybe 1h-24h
        });

        return {
            container: container.containerName,
            path: blobName,
            secureUploadUrl: url,
            originalName: args.originalName,
            provider: args.provider,
            region: args.region
        };
    }
}

export interface InitFileUploadArgs {
    originalName: string;
    fileSize: number;
    provider: string;
    region: string;
}

export interface InitFileUploadResult {
    container: string;
    path: string;
    secureUploadUrl: string;
    originalName: string;
    provider: string;
    region: string;
}