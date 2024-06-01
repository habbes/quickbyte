import { Collection, UpdateFilter } from "mongodb";
import { createAppError, createInvalidAppStateError, createNotFoundError, createOperationNotSupportedError, createResourceNotFoundError, createSubscriptionInsufficientError, createSubscriptionRequiredError, createValidationError, rethrowIfAppError } from '../error.js';
import { AuthContext, createPersistedModel, TransferFile, Transfer, DbTransfer,  DownloadRequest, Project } from '../models.js';
import { IStorageHandler, IStorageHandlerProvider, S3StorageHandler } from './storage/index.js'
import { IPlaybackPackagerProvider, ITransactionService, PlaybackPackager } from "./index.js";
import { Database, updateNowBy } from "../db.js";
import { CreateShareableTransferArgs, CreateProjectMediaUploadArgs, CreateTransferArgs, CreateTransferFileArgs, DownloadTransferFileResult, InitTransferFileUploadArgs, CompleteFileUploadArgs, FinalizeTransferArgs, CreateTransferResult, CreateTransferFileResult, PlaybackPackagingResult } from "@quickbyte/common";
import { EventDispatcher } from "./event-bus/index.js";
import { wrapError } from "../utils.js";
import { BackgroundWorker } from "../background-worker.js";

const DAYS_TO_MILLIS = 24 * 60 * 60 * 1000;
const DOWNLOAD_LINK_EXPIRY_INTERVAL_MILLIS = 7 * DAYS_TO_MILLIS; // 7 days


export interface TransferServiceConfig {
    providerRegistry: IStorageHandlerProvider,
    packagers: IPlaybackPackagerProvider,
    transactions: ITransactionService,
    eventBus: EventDispatcher
}

export class TransferService {
    private collection: Collection<DbTransfer>;
    private filesCollection: Collection<TransferFile>;

    constructor(private db: Database, private authContext: AuthContext, private config: TransferServiceConfig) {
        this.collection = this.db.transfers();
        this.filesCollection = this.db.files();
    }

    create(args: CreateShareableTransferArgs): Promise<CreateTransferResult> {
        return this.createInternal({ ...args, accountId: this.authContext.user.account._id });
    }

    async createProjectMediaUpload(project: Project, args: CreateProjectMediaUploadArgs): Promise<CreateTransferResult> {
        try {
    
            const transfer = await this.createInternal({
                ...args,
                name: `Media upload for ${project.name} - (${new Date().toDateString()})`,
                projectId: project._id,
                mediaId: args.mediaId,
                folderId: args.folderId,
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
            if (!args.files.length) {
                throw createValidationError('No files specified for transfer.');
            }
            const sub = await this.config.transactions.tryGetActiveSubscription(args.accountId);
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
                accountId: args.accountId,
                hidden: args.hidden,
                projectId: args.projectId,
                folderId: args.folderId,
                mediaId: args.mediaId,
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

    async initFileUpload(args: InitTransferFileUploadArgs) {
        try {
            // only the user who has created a transfer
            // can initiate file uploads
            // 
            const transfer = await this.collection.findOne({
                _id: args.transferId,
                '_createdBy._id': this.authContext.user._id,
                status: 'progress'
            });

            if (!transfer) {
                throw createNotFoundError('transfer');
            }

            const file = await this.filesCollection.findOne({ _id: args.fileId, transferId: args.transferId });
            if (!file) {
                throw createNotFoundError('file');
            }

            // On Azure, we can initiate a multipart upload
            // with a single presigned url that will be used for all the files.
            // On S3 we have to initiate a multipart upload first to get the upload id
            // then we have to presign each part individually and attach the upload id
            // to it. To make uplaods efficient, this endpoint is used
            // to initate the upload and presign all the blocks in advance.
            // TODO: we should probably limit how many pre-signed urls we generate
            // in one request.

            const provider = this.config.providerRegistry.getHandler(file.provider);
            const blobName = `${transfer._id}/${file._id}`;
            const result = await provider.initBlobUpload(
                file.region,
                transfer.accountId,
                blobName,
                file.size,
                args.blockSize
            );

            return result;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async completeFileUpload(args: CompleteFileUploadArgs) {
        try {
            // only the user who has created a transfer
            // can complete file uploads
            // 
            const transfer = await this.collection.findOne({
                _id: args.transferId,
                '_createdBy._id': this.authContext.user._id,
                status: 'progress'
            });

            if (!transfer) {
                throw createNotFoundError('transfer');
            }

            const file = await this.filesCollection.findOne({ _id: args.fileId, transferId: args.transferId });
            if (!file) {
                throw createNotFoundError('file');
            }

            const provider = this.config.providerRegistry.getHandler(file.provider);
            const blobName = `${transfer._id}/${file._id}`;
            await provider.completeBlobUpload(
                file.region,
                transfer.accountId,
                blobName,
                args.providerArgs
            );
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async finalize(id: string, args: FinalizeTransferArgs): Promise<Transfer> {
        try {
            const result = await this.collection.findOneAndUpdate({
                _id: id,
                // only the user who started the upload should be able to finalize it
                '_createdBy._id': this.authContext.user._id
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

            this.config.eventBus.send({
                type: 'transferComplete',
                data: {
                    transfer: result.value
                }
            });

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
            const downloadableFile = createDownloadAndPlayableFile(provider, this.config.packagers, this.db, file);

            return downloadableFile;

        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    getMediaFiles(fileIds: string[]): Promise<DownloadTransferFileResult[]> {
        return getMediaFiles(
            fileIds,
            this.db,
            this.config.providerRegistry,
            this.config.packagers
        );
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
                files.map(file => createTransferDownloadFile(provider,  transfer, file))
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

export async function queueTransferFilesForPackaging(
    transferId: string,
    context: {
        db: Database,
        packagers: IPlaybackPackagerProvider,
        queue: BackgroundWorker
    }
) {
    return wrapError(async () => {
        const files = await context.db.files().find({ transferId }).toArray();
        for (let file of files) {
            if (file.playbackPackagingId) {
                continue;
            }

            console.log(`Queuing file ${file._id} from transfer ${transferId} for packaging.`);
            context.queue.queueJob(() => tryStartPackagingFile(
                file._id,
                {
                    packagers: context.packagers,
                    db: context.db
                }
            ));
        }
    });
}

export async function tryStartPackagingFile(
    fileId: string,
    context: {
        packagers: IPlaybackPackagerProvider,
        db: Database
    }
) {
    console.log(`Attempting to package file ${fileId}`);
    return wrapError(async () => {
        const file = await context.db.files().findOne({
            _id: fileId
        });

        if (!file) {
            throw createNotFoundError('file');
        }

        if (file.playbackPackagingId) {
            console.warn(
                `Attempting to package file '${file._id}' that has already been packaged by '${file.playbackPackagingProvider}' with packaging id '${file.playbackPackagingId}' and status '${file.playbackPackagingStatus}'. Aborting...`
            );
            return file;

            // TODO: it may be possible that we want to package a file that has already been scheduled for packaging, for example
            // if we want to change the packager, or if the initial process had some issue, etc. We can revisit
            // this logic when we need to implement support for such scenarios.
        }

        const packager = context.packagers.tryFindPackagerForFile(file);
        if (!packager) {
            console.warn(`Could not find packager for file id '${file._id}', name: '${file.name}'. Ignoring file...`);
            return;
        }

        console.log(`Attempting to package file ${file._id} with packager ${packager.name()}`);
        const packagingResult = await packager.startPackagingFile(file);
        console.log(`Packaging initiated for file ${file._id} with packaging id ${packagingResult.providerId} with status ${packagingResult.status} using packager ${packager.name()}`);
        const updateResult = await setFilePackagingInfoById(
            file._id,
            packager.name(),
            packagingResult,
            {
                db: context.db
            }
        );
        
        return updateResult;
    });
}

export async function updateFilePackagingMetadata(
    packagerName: string,
    packagingId: string,
    context: {
        packagerProvider: IPlaybackPackagerProvider,
        db: Database
    }): Promise<TransferFile>
{
    return wrapError(async () => {
        const packager = context.packagerProvider.getPackager(packagerName);
        const file = await context.db.files().findOne({
            playbackPackagingProvider: packagerName,
            playbackPackagingId: packagingId
        });

        if (!file) {
            throw createResourceNotFoundError(`File not found with packager ${packagerName} and packagingId ${packagingId}`);
        }

        const result = await updateFilePackagingInfoInternal(file, packager, { db: context.db });
        return result;
    });
}

async function updateFilePackagingInfoInternal(
    file: TransferFile,
    packager: PlaybackPackager,
    context: { db: Database }
) {
    return wrapError(async () => {
        if (file.playbackPackagingProvider !== packager.name()) {
            throw createInvalidAppStateError(
                `Attempting to set packing info for file '${file._id}' with packager ${packager.name()} but it was packaged with ${file.playbackPackagingProvider}`
            );
        }

        const info = await packager.getPackagingInfo(file);
        const updateResult = await setFilePackagingInfoById(file._id, packager.name(), info, { db: context.db });
        return updateResult;
    })
}

async function setFilePackagingInfoById(
    fileId: string,
    packagerName: string,
    info: PlaybackPackagingResult,
    context: {
        db: Database
    }
) {
    const updateResult = await context.db.files().findOneAndUpdate({
        _id: fileId
    }, {
        $set: {
            playbackPackagingProvider: packagerName,
            playbackPackagingId: info.providerId,
            playbackPackagingStatus: info.status,
            playbackPackagingError: info.error,
            playbackPackagingErrorReason: info.errorReason,
            playbackPackagingMetadata: info.metatada,
            ...updateNowBy({ type: 'system', _id: 'system' })
        }
    }, {
        returnDocument: 'after'
    });

    if (!updateResult.value) {
        throw createAppError(`Failed to update file ${fileId} with packaging status ${info.status}.`);
    }

    return updateResult.value;
}

// TODO: I don't think there's much gain in passing around
// an interface instead of the actual service class since
// we'll only have on implementation anyway.
export type ITransferService = TransferService;
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
    // TODO: for s3 we should not create presigned upload URLS because we'll presign
    // each block individually
    const uploadUrl = await provider.getBlobUploadUrl(transfer.region, transfer.accountId, blobName, expiryDate);
    return {
        ...file,
        uploadUrl
    }
}

export async function getMediaFiles(
    fileIds: string[],
    db: Database,
    storageProviders: IStorageHandlerProvider,
    packagers: IPlaybackPackagerProvider
): Promise<DownloadTransferFileResult[]> {
    try {
        const files = await db.files().find({ _id: { $in: fileIds } }).toArray();

        const downloadableFilesTasks = files.map(file => {
            const provider = storageProviders.getHandler(file.provider);
            return createDownloadAndPlayableFile(provider, packagers, db,  file);
        });

        const downloadableFiles = await Promise.all(downloadableFilesTasks);
        return downloadableFiles;

    } catch (e: any) {
        rethrowIfAppError(e);
        throw createAppError(e);
    }
}

export async function getDownloadableFiles(
    fileIds: string[],
    db: Database,
    storageProviders: IStorageHandlerProvider
): Promise<DownloadTransferFileResult[]> {
    try {
        const files = await db.files().find({ _id: { $in: fileIds } }).toArray();

        const downloadableFilesTasks = files.map(file => {
            const provider = storageProviders.getHandler(file.provider);
            return createDownloadableFile(provider, file);
        });

        const downloadableFiles = await Promise.all(downloadableFilesTasks);
        return downloadableFiles;

    } catch (e: any) {
        rethrowIfAppError(e);
        throw createAppError(e);
    }
}

async function createTransferDownloadFile(provider: IStorageHandler, transfer: Transfer, file: TransferFile): Promise<DownloadTransferFileResult> {
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

async function createDownloadableFile(provider: IStorageHandler, file: TransferFile) {
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

    const downlodableFile: DownloadTransferFileResult = {
        _id: file._id,
        transferId: file.transferId,
        name: file.name,
        size: file.size,
        _createdAt: file._createdAt,
        downloadUrl,
        accountId: file.accountId
    };

    return downlodableFile;
}

async function createDownloadAndPlayableFile(provider: IStorageHandler, packagers: IPlaybackPackagerProvider, db: Database, file: TransferFile): Promise<DownloadTransferFileResult> {
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

    let downlodableFile: DownloadTransferFileResult = {
        _id: file._id,
        transferId: file.transferId,
        name: file.name,
        size: file.size,
        _createdAt: file._createdAt,
        downloadUrl,
        accountId: file.accountId
    }

    if (file.playbackPackagingProvider) {
        const packager = packagers.getPackager(file.playbackPackagingProvider);
        if (packager) {
            let status = file.playbackPackagingStatus;
            if (file.playbackPackagingStatus !== 'error' && file.playbackPackagingStatus !== 'success') {
                const updatedFile = await updateFilePackagingInfoInternal(file, packager, { db: db });
                status = updatedFile.playbackPackagingStatus;
            }

            const playbackUrls = await packager.getPlaybackUrls(file);
            downlodableFile = {
                ...downlodableFile,
                ...playbackUrls,
                playbackPackagingStatus: status
            };
        }
    }
    else {
        console.log(`Media download file ${file._id} has no packager. Attempting to initiate packaging...`);
        // we should only try to package when we're sure upload is complete otherwise
        // packaging (and playback) will fail
        const transfer = await db.transfers().findOne({ _id: file.transferId });
        if (!transfer) {
            throw createInvalidAppStateError(`Could not find transfer '${file.transferId}' of file '${file._id}'`);
        }
        // TODO: checking for transfer status is problematic
        // first, it's a separate db request, which adds to the request's latency
        // second, it's possible that the file upload has completed but the overall
        // transfer is still in progress
        // it's possible that the file upload is complete but the transfer may never complete
        // because we depend on the client sending a finalize request to mark the transfer as
        // complete. We should do a better job of tracking per-file upload status and readiness.
        if (transfer.status === 'completed') {
            // if no packager is assigned to the file, then it was probably uploaded
            // before the encoding feature was rolled out. Let's schedule it
            // for packaging
            console.log(`Found completed transfer ${transfer._id} for file ${file._id}, try start packaging...`);
            const updatedFile = await tryStartPackagingFile(file._id, { db, packagers});
            // TODO: it's possible that this file has not been packaged because it's not a supported media file
            // (e.g. not an audio or video file). In which case, we'll always try to package and abort each
            // time the file is requested for download. We can avoid this by storing a field in the db
            // indicating that a file was found not supported by media. We should probably also
            // index files by extension and media type

            if (updatedFile) {
                downlodableFile = { ...downlodableFile, playbackPackagingStatus: updatedFile.playbackPackagingStatus };
            }
        } else {
            console.warn(`Skipping packaging attempt for file '${file._id}' because transfer '${transfer._id}' is not complete. Status is '${transfer.status}'`);
        }
    }

    return downlodableFile;
}

/**
 * Gets a download url for the specified file using the specified provider.
 * The provider should match what was used to upload the file.
 * @param provider 
 * @param file 
 * @param validityInMillis Determines when the download url will expire. If not provided, if 0,
 * then the the url will be valid for 24 hours..
 */
export async function getFileDownloadUrl(provider: IStorageHandler, file: TransferFile, validityInMillis?: number): Promise<string|undefined> {
    if (!file.accountId) {
        // TODO: We should ensure all files have an accountId
        return;
    }

    // TODO: we should store the blobPath into the file itself to keep file resilient
    // from design changes on where we store paths
    const blobName = `${file.transferId}/${file._id}`;

    const expiryDate = validityInMillis ? new Date(Date.now() + validityInMillis) : new Date(Date.now() + DAYS_TO_MILLIS);
    const fileName = file.name.split('/').at(-1) || file._id;
    const downloadUrl = await provider.getBlobDownloadUrl(file.region, file.accountId, blobName, expiryDate, fileName);

    return downloadUrl;
}

export interface GetTransferResult extends Transfer {
    files: GetTransferFileResult[];
}

export interface GetTransferFileResult extends TransferFile {
    uploadUrl: string;
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
