import { Db, Collection } from "mongodb";
import { createAppError, createResourceNotFoundError, rethrowIfAppError } from '../error.js';
import { AuthContext, createPersistedModel, Download, File } from '../models.js';
import { IStorageHandlerProvider } from './storage/index.js'

const COLLECTION = "files";
const DOWNLOAD_COLLECTION = "downloads";
const UPLOAD_LINK_EXPIRY_INTERVAL_MILLIS = 5 * 24 * 60 * 60 * 1000; // 5 days
const DOWNLOAD_LINK_EXPIRY_INTERVAL_MILLIS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class FileService {
    private collection: Collection<File>;
    private downloadsCollection: Collection<Download>;

    constructor(private db: Db, private authContext: AuthContext, private providerRegistry: IStorageHandlerProvider) {
        this.collection = this.db.collection(COLLECTION);
        this.downloadsCollection = this.db.collection(DOWNLOAD_COLLECTION);
    }

    async initFileUpload(args: InitFileUploadArgs): Promise<InitFileUploadResult> {
        try {
            const provider = this.providerRegistry.getHandler(args.provider);
            

            const baseModel = createPersistedModel({ type: "user", _id: this.authContext.user._id });
            const file: File = {
                ...baseModel,
                provider: provider.name(),
                region: args.region,
                accountId: this.authContext.user.account._id,
                originalName: args.originalName,
                fileSize: args.fileSize,
                fileType: args.fileType,
                md5Hex: args.md5Hex,
                status: 'pending',
                path: baseModel._id
            };

            const blobName = file.path;
            const now = file._createdAt.getTime();
            const expiryDate = new Date(now + UPLOAD_LINK_EXPIRY_INTERVAL_MILLIS);
            const uploadUrl = await provider.getBlobUploadUrl(args.region, this.authContext.user.account._id, blobName, expiryDate);

            await this.collection.insertOne(file);

            return {
                ...file,
                secureUploadUrl: uploadUrl,
            };
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getAll() {
        try {
            const result = await this.collection.find({}).toArray();
            return result;
        } catch (e: any) {
            throw createAppError(e);
        }
    }

    async getById(id: string) {
        try {
            const result = await this.collection.findOne({ _id: id });
            if (!result) {
                throw createResourceNotFoundError();
            }

            return result;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async requestDownload(id: string): Promise<Download> {
        try {
            const file = await this.getById(id);
            const provider = this.providerRegistry.getHandler(file.provider);
            const now = file._createdAt.getTime();
            const expiryDate = new Date(now + DOWNLOAD_LINK_EXPIRY_INTERVAL_MILLIS);
            const downloadUrl = await provider.getBlobDownloadUrl(file.region, this.authContext.user.account._id, file.path, expiryDate, file.originalName);

            const download: Download = {
                ...createPersistedModel({ type: "user", _id: this.authContext.user._id }),
                fileId: file._id,
                accountId: file.accountId,
                fileSize: file.fileSize,
                originalName: file.originalName,
                downloadUrl,
                numRequests: 0,
                provider: provider.name(),
                region: file.region,
                expiryDate,
                fileType: file.fileType
            };

            // should probably user DownloadService to insert
            // instead of accessing collection directly
            this.downloadsCollection.insertOne(download);
            
            return download;

        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type IFileService = Pick<FileService, 'initFileUpload' | 'getAll' | 'requestDownload'>;

export class DownloadService {
    private collection: Collection<Download>;

    constructor (private db: Db) {
        this.collection = this.db.collection(DOWNLOAD_COLLECTION);
    }

    getById(id: string) {
        try {
            const download = this.collection.findOne({ _id: id });
            if (!download) {
                throw createResourceNotFoundError();
            }

            return download;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type IDownloadService = Pick<DownloadService, "getById">;

export interface InitFileUploadArgs {
    originalName: string;
    fileSize: number;
    provider: string;
    region: string;
    md5Hex: string;
    fileType: string;
}

export interface InitFileUploadResult extends File {
    secureUploadUrl: string;
}
