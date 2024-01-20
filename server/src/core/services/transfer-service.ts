import { Db, Collection, UpdateFilter } from "mongodb";
import { createAppError, createInvalidAppStateError, createNotFoundError, createResourceNotFoundError, createSubscriptionInsufficientError, createSubscriptionRequiredError, rethrowIfAppError } from '../error.js';
import { AuthContext, createPersistedModel, TransferFile, Transfer, DbTransfer,  DownloadRequest, Project } from '../models.js';
import { IStorageHandler, IStorageHandlerProvider } from './storage/index.js'
import { ITransactionService } from "./index.js";
import { Database } from "../db.js";

const COLLECTION = "transfers";
const FILES_COLLECTION = "files";
const DOWNLOADS_COLLECTION = "downloads";
const DAYS_TO_MILLIS = 24 * 60 * 60 * 1000;
const UPLOAD_LINK_EXPIRY_INTERVAL_MILLIS = 5 * DAYS_TO_MILLIS // 5 days
const DOWNLOAD_LINK_EXPIRY_INTERVAL_MILLIS = 7 * DAYS_TO_MILLIS; // 7 days
const MEDIA_DOWNLOAD_URL_VALIDITY = 2 * DAYS_TO_MILLIS;


export interface TransferServiceConfig {
    providerRegistry: IStorageHandlerProvider,
    transactions: ITransactionService,
}

export class TransferService {
    private collection: Collection<DbTransfer>;
    private filesCollection: Collection<TransferFile>;

    constructor(private db: Database, private authContext: AuthContext, private config: TransferServiceConfig) {
        this.collection = this.db.transfers();
        this.filesCollection = this.db.files();
    }

    create(args: CreateShareableTransferArgs): Promise<CreateTransferResult> {
        return this.createInternal({ ...args, accountId: this.authContext.user._id });
    }

    async createProjectMediaUpload(project: Project, args: CreateProjectMediaUploadArgs): Promise<CreateTransferResult> {
        try {
    
            const transfer = await this.createInternal({
                ...args,
                name: `Media upload for ${project.name} - (${new Date().toDateString()})`,
                projectId: project._id,
                hidden: true,
                accountId: project.accountId
            });

            return transfer;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private async createInternal(args: CreateTransferArgs): Promise<CreateTransferResult> {
        try {

            const sub = await this.config.transactions.tryGetActiveSubscription();
            if (!sub) {
                throw createSubscriptionRequiredError();
            }

            const totalSize = args.files.reduce((sizeSoFar, file) => sizeSoFar + file.size, 0);
            if (totalSize > sub.plan.maxTransferSize) {
                throw createSubscriptionInsufficientError();
            }

            const provider = this.config.providerRegistry.getHandler(args.provider);
            

            const baseModel = createPersistedModel({ type: "user", _id: this.authContext.user._id });
            const validityInMillis = sub.plan.maxTransferValidity ?
                sub.plan.maxTransferValidity * DAYS_TO_MILLIS : DOWNLOAD_LINK_EXPIRY_INTERVAL_MILLIS;
            const transfer: DbTransfer = {
                ...baseModel,
                name: args.name,
                provider: provider.name(),
                region: args.region,
                accountId: this.authContext.user.account._id,
                hidden: args.hidden,
                projectId: args.projectId,
                status: 'progress',
                expiresAt: new Date(Date.now() + validityInMillis),
                numFiles: args.files.length,
                totalSize: args.files.reduce((sizeSoFar, file) => sizeSoFar + file.size, 0)
            };
            
            if (args.meta) {
                transfer.meta = args.meta;
            }

            const transferFiles = args.files.map(f => createTransferFile(transfer, f));

            await Promise.all([
                this.collection.insertOne(transfer),
                this.filesCollection.insertMany(transferFiles)
            ]);

            const resultFiles = await Promise.all(transferFiles.map(f => createResultFile(provider, transfer, f)));

            return {
                ...transfer,
                files: resultFiles
            };
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getById(id: string): Promise<GetTransferResult> {
        try {
            const [transfer, files] = await Promise.all([
                this.collection.findOne({ _id: id }),
                this.filesCollection.find({ transferId: id }).toArray()
            ]);

            if (!transfer || !files.length) {
                throw createResourceNotFoundError('The transfer does not exist.');
            }

            const provider = this.config.providerRegistry.getHandler(transfer.provider);

            const resultFiles = await Promise.all(files.map(file => createResultFile(provider, transfer, file)));
            
            return {
                ...transfer,
                files: resultFiles
            }
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async get(): Promise<Transfer[]> {
        try {
            const transfers = await this.collection.find({
                accountId: this.authContext.user.account._id,
                hidden: { $ne: true }
            }).toArray();
            return transfers;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async finalize(id: string, args: FinalizeTransferArgs): Promise<Transfer> {
        try {
            const result = await this.collection.findOneAndUpdate({
                _id: id
            }, {
                $set: {
                    status: 'completed',
                    _updatedAt: new Date(),
                    _updatedBy: { type: 'user', _id: this.authContext.user._id },
                    transferCompletedAt: new Date(),
                    'meta.duration': args.duration,
                    'meta.recovered': args.recovered,
                }
            }, {
                returnDocument: 'after'
            });

            if (!result.ok || !result.value) {
                throw createResourceNotFoundError();
            }

            return result.value;

        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getMediaFile(fileId: string): Promise<DownloadTransferFileResult> {
        try {
            const file = await this.filesCollection.findOne({ _id: fileId });
            if (!file) {
                throw createNotFoundError('media');
            }

            const provider = this.config.providerRegistry.getHandler(file.provider);
            const downloadableFile = createMediaDownloadFile(provider, file);

            return downloadableFile;

        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
    
}

export class TransferDownloadService {
    private collection: Collection<Transfer>;
    private filesCollection: Collection<TransferFile>;
    private downloadsCollection: Collection<DownloadRequest>;

    constructor (private db: Database, private providerRegistry: IStorageHandlerProvider) {
        this.collection = db.transfers();
        this.filesCollection = db.files();
        this.downloadsCollection = db.downloads();
    }

    async requestDownload(transferId: string, args: DownloadRequestArgs): Promise<DownloadTransferResult> {
        try {
            const id = transferId;

            const [transfer, files] = await Promise.all([
                this.collection.findOne({ _id: id, expiresAt: { $gt: new Date()} }),
                this.filesCollection.find({ transferId: id }).toArray()
            ]);

            if (!transfer || !files.length) {
                throw createResourceNotFoundError('Transfer does not exist');
            }

            const baseModel = createPersistedModel({ type: 'system', _id: 'system'});
            const request: DownloadRequest = {
                ...baseModel,
                transferId: id,
                ip: args.ip,
                userAgent: args.userAgent,
                countryCode: args.countryCode
            };

            await this.downloadsCollection.insertOne(request);

            const provider = this.providerRegistry.getHandler(transfer.provider);
            const downloadableFiles = await Promise.all(
                files.map(file => createDownloadFile(provider, transfer, file))
            );

            return {
                _id: transfer._id,
                _createdAt: transfer._createdAt,
                name: transfer.name,
                files: downloadableFiles,
                downloadRequestId: request._id
            }

        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async updateDownloadRequest(transferId: string, requestId: string, args: DownloadRequestUpdateArgs): Promise<void> {
        try {
            const fieldsToSet: Partial<DownloadRequest> = {
                _updatedAt: new Date(),
                _updatedBy: { type: 'system', _id: 'system' }
            };
            if (args.ip) {
                fieldsToSet.ip = args.ip;
            }

            if (args.countryCode) {
                fieldsToSet.countryCode = args.countryCode;
            }

            if (args.downloadAllZip) {
                fieldsToSet.downloadAllZip;
            }

            const update: UpdateFilter<DownloadRequest> = {};
            update.$set = fieldsToSet;

            if (args.requestedFiles) {
                // TODO: do we want to validate that all the files here are valid?
                update.$addToSet = {
                    filesRequested: { $each: args.requestedFiles }
                };
            }

            const result = await this.downloadsCollection.findOneAndUpdate(
                { _id: requestId, transferId },
                update,
                {
                    returnDocument: 'after'
                }
            );

            if (!result.value) {
                throw createResourceNotFoundError('Download request not found');
            }

        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type ITransferService = Pick<TransferService, 'create'| 'createProjectMediaUpload'|'finalize'|'getById'|'get'|'getMediaFile'>;
export type ITransferDownloadService = Pick<TransferDownloadService, 'requestDownload'|'updateDownloadRequest'>;

function createTransferFile(transfer: Transfer, args: CreateTransferFileArgs): TransferFile {
    const baseModel = createPersistedModel(transfer._createdBy);
    const file = {
        ...baseModel,
        transferId: transfer._id,
        name: args.name,
        size: args.size,
        provider: transfer.provider,
        region: transfer.region,
        accountId: transfer.accountId
    };

    return file;
}

async function createResultFile(provider: IStorageHandler, transfer: Transfer, file: TransferFile): Promise<CreateTransferFileResult> {
    const blobName = `${transfer._id}/${file._id}`;
    const expiryDate = new Date(transfer.expiresAt);
    const uploadUrl = await provider.getBlobUploadUrl(transfer.region, transfer.accountId, blobName, expiryDate);
    return {
        ...file,
        uploadUrl
    }
}

async function createDownloadFile(provider: IStorageHandler, transfer: Transfer, file: TransferFile): Promise<DownloadTransferFileResult> {
    const blobName = `${transfer._id}/${file._id}`;
    // TODO: what if the owner changes the expiry date?
    const expiryDate = new Date(transfer.expiresAt);
    const fileName = file.name.split('/').at(-1) || file._id;
    const downloadUrl = await provider.getBlobDownloadUrl(transfer.region, transfer.accountId, blobName, expiryDate, fileName);

    return {
        _id: file._id,
        transferId: transfer._id,
        name: file.name,
        size: file.size,
        _createdAt: file._createdAt,
        downloadUrl,
        accountId: file.accountId || transfer.accountId
    };
}

async function createMediaDownloadFile(provider: IStorageHandler, file: TransferFile): Promise<DownloadTransferFileResult> {
    if (!file.accountId) {
        throw createInvalidAppStateError(`Media file '${file._id}' is not tied to an account`);
    }
    // TODO: we should store the blobPath into the file itself to keep file resilient
    // from design changes on where we store paths
    const blobName = `${file.transferId}/${file._id}`;
    const now = new Date().getTime();

    const expiryDate = new Date(now + DAYS_TO_MILLIS);
    const fileName = file.name.split('/').at(-1) || file._id;
    const downloadUrl = await provider.getBlobDownloadUrl(file.region, file.accountId, blobName, expiryDate, fileName);

    return {
        _id: file._id,
        transferId: file.transferId,
        name: file.name,
        size: file.size,
        _createdAt: file._createdAt,
        downloadUrl,
        accountId: file.accountId
    }

}

export interface CreateShareableTransferArgs {
    name: string;
    provider: string;
    region: string;
    files: CreateTransferFileArgs[];
    meta?: CreateTransferMeta;
}

export interface CreateProjectMediaUploadArgs {
    provider: string;
    region: string;
    files: CreateTransferFileArgs[];
    meta?: CreateTransferMeta;
}

interface CreateTransferMeta {
    ip?: string;
    countryCode?: string;
    state?: string;
    userAgent?: string;
}

export interface CreateTransferArgs extends CreateShareableTransferArgs {
    hidden?: boolean;
    projectId?: string;
    accountId: string;
}

export interface CreateTransferFileArgs {
    name: string;
    size: number;
}

export interface CreateTransferResult extends Transfer {
    files: CreateTransferFileResult[]
}

export interface CreateTransferFileResult extends TransferFile {
    uploadUrl: string;
}

export interface GetTransferResult extends Transfer {
    files: GetTransferFileResult[];
}

export interface GetTransferFileResult extends TransferFile {
    uploadUrl: string;
}

export interface FinalizeTransferArgs {
    duration: number;
    recovered?: boolean;
}

export interface DownloadRequestArgs {
    ip?: string;
    countryCode?: string;
    userAgent?: string;
}

export interface DownloadRequestUpdateArgs {
    ip?: string;
    countryCode?: string;
    userAgent?: string;
    requestedFiles?: string[];
    downloadAllZip?: boolean;
}

export interface DownloadTransferResult extends Pick<Transfer, '_id'|'name'|'_createdAt'> {
    files: DownloadTransferFileResult[];
    downloadRequestId: string;
}

export interface DownloadTransferFileResult extends Pick<TransferFile, '_id'|'transferId'|'name'|'size'|'_createdAt'|'accountId'> {
    downloadUrl: string;
}