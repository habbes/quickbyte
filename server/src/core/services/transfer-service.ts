import { Db, Collection, UpdateFilter } from "mongodb";
import { createAppError, createResourceNotFoundError, createSubscriptionInsufficientError, createSubscriptionRequiredError, rethrowIfAppError } from '../error.js';
import { AuthContext, createPersistedModel, TransferFile, Transfer, DbTransfer,  DownloadRequest } from '../models.js';
import { IStorageHandler, IStorageHandlerProvider } from './storage/index.js'
import { ITransactionService } from "./index.js";

const COLLECTION = "transfers";
const FILES_COLLECTION = "files";
const DOWNLOADS_COLLECTION = "downloads";
const DAYS_TO_MILLIS = 24 * 60 * 60 * 1000;
const UPLOAD_LINK_EXPIRY_INTERVAL_MILLIS = 5 * DAYS_TO_MILLIS // 5 days
const DOWNLOAD_LINK_EXPIRY_INTERVAL_MILLIS = 7 * DAYS_TO_MILLIS; // 7 days


export interface TransferServiceConfig {
    providerRegistry: IStorageHandlerProvider,
    transactions: ITransactionService,
}

export class TransferService {
    private collection: Collection<DbTransfer>;
    private filesCollection: Collection<TransferFile>;

    constructor(private db: Db, private authContext: AuthContext, private config: TransferServiceConfig) {
        this.collection = this.db.collection(COLLECTION);
        this.filesCollection = this.db.collection(FILES_COLLECTION);
    }

    async create(args: CreateTransferArgs): Promise<CreateTransferResult> {
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

            console.log('result value', result.value);
            return result.value;

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

    constructor (private db: Db, private providerRegistry: IStorageHandlerProvider) {
        this.collection = db.collection(COLLECTION);
        this.filesCollection = db.collection(FILES_COLLECTION);
        this.downloadsCollection = db.collection(DOWNLOADS_COLLECTION);
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

export type ITransferService = Pick<TransferService, 'create'|'finalize'|'getById'>;
export type ITransferDownloadService = Pick<TransferDownloadService, 'requestDownload'|'updateDownloadRequest'>;

function createTransferFile(transfer: Transfer, args: CreateTransferFileArgs): TransferFile {
    const baseModel = createPersistedModel(transfer._createdBy);
    const file = {
        ...baseModel,
        transferId: transfer._id,
        name: args.name,
        size: args.size,
        provider: transfer.provider,
        region: transfer.region
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
        downloadUrl
    };
}

export interface CreateTransferArgs {
    name: string;
    provider: string;
    region: string;
    files: CreateTransferFileArgs[];
    meta?: {
        ip?: string;
        countryCode?: string;
        state?: string;
        userAgent?: string;
    }
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

export interface DownloadTransferFileResult extends Pick<TransferFile, '_id'|'transferId'|'name'|'size'|'_createdAt'> {
    downloadUrl: string;
}