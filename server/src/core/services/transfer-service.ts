import { Db, Collection } from "mongodb";
import { createAppError, createResourceNotFoundError, rethrowIfAppError } from '../error.js';
import { AuthContext, createPersistedModel, TransferFile, Transfer, Download } from '../models.js';
import { IStorageHandler, IStorageHandlerProvider } from './storage/index.js'

const COLLECTION = "transfers";
// TODO: this collection should just be called "files"
const FILES_COLLECTION = "transferFiles";
const LEGACY_DOWNLOAD_COLLECTION = "downloads";
const UPLOAD_LINK_EXPIRY_INTERVAL_MILLIS = 5 * 24 * 60 * 60 * 1000; // 5 days
const DOWNLOAD_LINK_EXPIRY_INTERVAL_MILLIS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class TransferService {
    private collection: Collection<Transfer>;
    private filesCollection: Collection<TransferFile>;

    constructor(private db: Db, private authContext: AuthContext, private providerRegistry: IStorageHandlerProvider) {
        this.collection = this.db.collection(COLLECTION);
        this.filesCollection = this.db.collection(FILES_COLLECTION);
    }

    async create(args: CreateTransferArgs): Promise<CreateTransferResult> {
        try {
            const provider = this.providerRegistry.getHandler(args.provider);
            

            const baseModel = createPersistedModel({ type: "user", _id: this.authContext.user._id });
            const transfer: Transfer = {
                ...baseModel,
                name: args.name,
                provider: provider.name(),
                region: args.region,
                accountId: this.authContext.user.account._id,
                status: 'pending',
                expiresAt: new Date(Date.now() + DOWNLOAD_LINK_EXPIRY_INTERVAL_MILLIS)
            };

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

            const provider = this.providerRegistry.getHandler(transfer.provider);

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

    async finalize(id: string): Promise<Transfer> {
        console.log('here', id);
        try {
            const result = await this.collection.findOneAndUpdate({
                _id: id
            }, {
                $set: {
                    status: 'completed',
                    _updatedAt: new Date(),
                    _updatedBy: { type: 'user', _id: this.authContext.user._id }
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
    private legacyDownloadCollection: Collection<Download>;
    private collection: Collection<Transfer>;
    private filesCollection: Collection<TransferFile>;

    constructor (private db: Db, private providerRegistry: IStorageHandlerProvider) {
        this.legacyDownloadCollection = db.collection(LEGACY_DOWNLOAD_COLLECTION);
        this.collection = db.collection(COLLECTION);
        this.filesCollection = db.collection(FILES_COLLECTION);
    }

    async getById(id: string): Promise<DownloadTransferResult> {
        try {
            // TODO: this is for backwards compatibility, should be removed
            // after preview
            const legacyDownload = await this.legacyDownloadCollection.findOne({ _id: id });
            if (legacyDownload) {
                return transformLegacyDownload(legacyDownload);
            }

            const [transfer, files] = await Promise.all([
                this.collection.findOne({ _id: id }),
                this.filesCollection.find({ transferId: id }).toArray()
            ]);

            if (!transfer || !files.length) {
                throw createResourceNotFoundError('Transfer does not exist');
            }

            const provider = this.providerRegistry.getHandler(transfer.provider);
            const downloadableFiles = await Promise.all(
                files.map(file => createDownloadFile(provider, transfer, file))
            );

            return {
                _id: transfer._id,
                _createdAt: transfer._createdAt,
                name: transfer.name,
                files: downloadableFiles
            }

        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type ITransferService = Pick<TransferService, 'create'|'finalize'|'getById'>;
export type ITransferDownloadService = Pick<TransferDownloadService, 'getById'>;

function transformLegacyDownload(download: Download): DownloadTransferResult {
    return {
        _id: download._id,
        _createdAt: download._createdAt,
        name: download.originalName,
        files: [
            {
                _id: download.fileId,
                name: download.originalName,
                size: download.fileSize,
                downloadUrl: download.downloadUrl,
                _createdAt: download._createdAt,
                transferId: download._id
            }
        ]
    }
}

function createTransferFile(transfer: Transfer, args: CreateTransferFileArgs): TransferFile {
    const baseModel = createPersistedModel(transfer._createdBy);
    const file = {
        ...baseModel,
        transferId: transfer._id,
        name: args.name,
        size: args.size
    };

    return file;
}

async function createResultFile(provider: IStorageHandler, transfer: Transfer, file: TransferFile): Promise<CreateTransferFileResult> {
    const blobName = `${transfer._id}/${file._id}`;
    const expiryDate = new Date(Date.now() + UPLOAD_LINK_EXPIRY_INTERVAL_MILLIS);
    const uploadUrl = await provider.getBlobUploadUrl(transfer.region, transfer.accountId, blobName, expiryDate);
    return {
        ...file,
        uploadUrl
    }
}

async function createDownloadFile(provider: IStorageHandler, transfer: Transfer, file: TransferFile): Promise<DownloadTransferFileResult> {
    const blobName = `${transfer._id}/${file._id}`;
    const expiryDate = new Date(Date.now() + DOWNLOAD_LINK_EXPIRY_INTERVAL_MILLIS);
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

export interface DownloadTransferResult extends Pick<Transfer, '_id'|'name'|'_createdAt'> {
    files: DownloadTransferFileResult[];
}

export interface DownloadTransferFileResult extends Pick<TransferFile, '_id'|'transferId'|'name'|'size'|'_createdAt'> {
    downloadUrl: string;
}