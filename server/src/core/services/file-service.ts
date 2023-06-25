import { randomBytes } from 'crypto';
import { IStorageHandlerProvider } from './storage/index.js'

export class FileService {
    constructor(private accountId: string, private providerRegistry: IStorageHandlerProvider) {}

    async initFileUpload(args: InitFileUploadArgs): Promise<InitFileUploadResult> {
        const connectionString = process.env.AZ_SA_NORTH_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error("Invalid connection string");
        }
        const containerName = process.env.AZ_STORAGE_CONTAINER;
        if (!containerName) {
            throw new Error("Container name not specified");
        }

        const currentDate = new Date();
        const blobName = randomBytes(16).toString('hex');
        const expiryDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1,
            currentDate.getHours(), currentDate.getMinutes());
        const provider = this.providerRegistry.getHandler(args.provider);
        const uploadUrl = await provider.getBlobUploadUrl(args.region, this.accountId, blobName, expiryDate);

        return {
            path: blobName,
            secureUploadUrl: uploadUrl,
            originalName: args.originalName,
        };
    }
}

export type IFileService = Pick<FileService, 'initFileUpload'>;

export interface InitFileUploadArgs {
    originalName: string;
    fileSize: number;
    provider: string;
    region: string;
}

export interface InitFileUploadResult {
    path: string;
    secureUploadUrl: string;
    originalName: string;
}