import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import { ensure } from '.';
import { Logger } from './logger';

const VERSION = 1;
const DB_NAME = 'quickbyte';
const TRANSFERS_STORE = 'transfers';
const FILES_STORE = 'files';
const BLOCKS_STORE = 'blocks';

interface RecoveryManagerArgs {
    onClear: () => unknown;
    onDelete: (transferId: string) => unknown;
    logger?: Logger;
}

interface RecoveryDbSchema extends DBSchema {
    transfers: {
        value: TrackedTransfer,
        key: string
    },
    files: {
        value: TrackedFile,
        key: string,
    },
    blocks: {
        value: {
            id: string,
            index: number,
            file: string,
        },
        key: string
    }
}

export class UploadRecoveryManager {
    isReady: boolean;
    private whenReady: Promise<void>;
    private db: IDBPDatabase<RecoveryDbSchema>|undefined;
    private resolveReadyPromise: (() => void) | undefined;
    private rejectReadyPromise: ((e: Error) => void) | undefined;

    constructor(private args: RecoveryManagerArgs) {
        this.isReady = false;
        this.whenReady = new Promise((resolve, reject) => {
            this.resolveReadyPromise = resolve;
            this.rejectReadyPromise = reject;
        });
    }

    async init(): Promise<void> {
        // TODO: handle errors
        const logger = this.args.logger;
        this.db = await openDB<RecoveryDbSchema>(DB_NAME, VERSION, {
            upgrade(db, oldVersion, newVesrsion) {
                const transfers = db.createObjectStore("transfers", {
                    keyPath: 'id'
                })
                
                const files = db.createObjectStore('files', {
                    keyPath: 'id'
                });
                
                const blocks = db.createObjectStore('blocks', {
                    keyPath: 'id'
                });

                const tasks = Promise.all([
                    transfers.transaction.done,
                    files.transaction.done,
                    blocks.transaction.done
                ]);

                tasks.then(() => logger?.log('complete creating object stores'));
            }
        });

        this.isReady = true;
        ensure(this.resolveReadyPromise)();
    }

    async getDb(): Promise<IDBPDatabase<RecoveryDbSchema>> {
        await this.whenReady;
        return ensure(this.db);
    }

    createTransferTracker(transfer: TrackedTransfer): TransferTracker {
        const tracker = new DefaultTransferTracker(this, transfer, this.args.logger);
        // we don't wait for this to finish in order to delay actual file uploads
        tracker.initNew(); 
        return tracker;
    }

    recoverTransferTracker(transfer: TrackedTransfer): TransferTracker {
        const tracker = new DefaultTransferTracker(this, transfer, this.args.logger);
        return tracker;
    }

    async getRecoveredTransfers(): Promise<TrackedTransfer[]> {
        await this.whenReady;
        const db = ensure(this.db);
        const transfers = await db.getAll("transfers");
        return transfers;
    }

    async deleteRecoveredTransfer(id: string): Promise<void> {
        // since we just want to delete the transfer,
        // we only need the id.
        // We should probably refactor this
        const tracker = new DefaultTransferTracker(this, {
            id: id,
            name: '',
            blockSize: 0,
            files: [],
            totalSize: 0,
            directories: []
        }, this.args.logger);
        
        await tracker.delete();
        this.args.onDelete(id);
    }

    async clearRecoveredTransfers(): Promise<void> {
        await this.whenReady;
        const db = ensure(this.db);
        const tx = db.transaction([TRANSFERS_STORE, FILES_STORE, BLOCKS_STORE], 'readwrite');
        const transfers = tx.objectStore(TRANSFERS_STORE);
        const files = tx.objectStore(FILES_STORE);
        const blocks = tx.objectStore(BLOCKS_STORE);
        await Promise.all([transfers.clear(), files.clear(), blocks.clear()]);
        await tx.done;
        this.args.onClear();
    }
}

export interface TransferTracker {
    /**
     * Signals the tracker that the upload is complete. This
     * allows the tracker to clean up and saved progress.
     */
    completeTransfer(): Promise<void>;
    /**
     * Creates a progress tracker for the specified file.
     * @param upload 
     */
    createFileTracker(upload: Omit<TrackedFile, 'transfer'>): FileTracker;
    /**
     * Recovers tracker for the specified file if it was in progress, or
     * creates one if it does not exist
     * @param upload 
     */
    recoverFileTracker(upload: Omit<TrackedFile, 'transfer'>): RecoveredFileTracker;
     /**
     * Initializes the tracker and recovers completed blocks.
     * This method must be called and wait for the returned
     * promise to resolve before tracking new blocks.
     * **This must not be called for a new upload**
     */
    initRecovery(): Promise<TransferInitRecoveryResult>;
}

export interface FileTracker {
    setS3PresignedBlocks(uploadId: string, blocks: S3PresignedBlock[]): Promise<void>;
    getS3PresignedBlocks(): Promise<{ s3UploadId: string, presignedBlocks: S3PresignedBlock[] }|undefined>;
    /**
     * **Eventually** marks the specified block as completed.
     * @param block 
     */
    completeBlock(block: TrackedBlock): void;
    /**
     * Signals the tracker that the upload is complete. This
     * allows the tracker to clean up and saved progress.
     */
    completeUpload(): Promise<void>;
}

export interface RecoveredFileTracker extends FileTracker {
}

class DefaultTransferTracker implements TransferTracker {
    fileTrackers: Map<string, DefaultFileTracker> = new Map();

    constructor(private manager: UploadRecoveryManager, private transfer: TrackedTransfer, private logger?: Logger) {
        
    }

    async initNew(): Promise<void> {
        const db = await this.manager.getDb();
        await db.put('transfers', this.transfer);
    }

    async initRecovery(): Promise<TransferInitRecoveryResult> {
        const db = await this.manager.getDb();
        // TODO: should we index blocks by file id?
        // Ideally there should be no more than recovered upload
        const allFiles = await db.getAll('files');
        const allBlocks = await db.getAll(BLOCKS_STORE);

        const result: TransferInitRecoveryResult = {
            completedFiles: new Map(),
            inProgressFiles: new Map()
        };

        for (const file of allFiles) {
            if (file.transfer !== this.transfer.id) {
                continue;
            }

            if (file.completed) {
                result.completedFiles.set(file.filename, file);
            }
            else {
                const fileEntry = {
                    file,
                    completedBlocks: new Map()
                };

                result.inProgressFiles.set(file.filename, fileEntry);

                for (const block of allBlocks) {
                    if (block.file !== file.id) {
                        continue;
                    }

                    fileEntry.completedBlocks.set(block.index, block);
                }
            }
        }

        return result;
    }

    createFileTracker(upload: TrackedFile): FileTracker {
        const tracker = new DefaultFileTracker(
            this.manager,
            { ...upload, transfer: this.transfer.id },
            this.logger
        );
        // We don't wait for the following promise to resolve because
        // we don't want to delay the actual file upload
        tracker.initNew();
        return tracker;
    }

    recoverFileTracker(upload: TrackedFile): RecoveredFileTracker {
        const tracker = new DefaultFileTracker(
            this.manager,
            { ...upload, transfer: this.transfer.id },
            this.logger);
        
        tracker.initRecovered();

        return tracker;
    }

    async getRecoveredUploads(): Promise<TrackedFile[]> {
        const db = await this.manager.getDb();
        const files: TrackedFile[] = await db.getAll(FILES_STORE);
        return files.filter(f => f.transfer === this.transfer.id);
    }

    async completeTransfer(): Promise<void> {
        await this.deleteTransfer();
        // When we complete the transfer we don't delete files directly
        // because we assume the file trackers have already been deleted
        // upon completion.
    }

    async delete(): Promise<void> {
        await Promise.all([
            this.deleteTransfer(),
            this.deleteFiles()
        ]);
    }

    private async deleteTransfer() {
        const started = Date.now();
        this.logger?.log(`deleting transfer ${this.transfer.id}...`);
        const db = await this.manager.getDb();
        const tx = db.transaction('transfers', 'readwrite');
        const transfers = tx.store;
        await transfers.delete(this.transfer.id);
        await tx.done;
        this.logger?.log(`deleted transfer in ${Date.now() - started}ms`);
    }

    private async deleteFiles() {
        this.logger?.log(`deleting transfer ${this.transfer.id} files`);
        const started = Date.now();
        const db = await this.manager.getDb();
        const tx = db.transaction('files', 'readwrite');
        const files = tx.store;
        // TODO as an optimization for the best (general) case
        // we should clear the store if there are no more files (i.e. the sole file was deleted)
        let cursor = await files.openCursor();
        while (cursor) {
            if (cursor.value.transfer === this.transfer.id) {
                await cursor.delete();
            }
    
            cursor = await cursor.continue();
        }
        await tx.done;
        this.logger?.log(`deleted transfer files in ${Date.now() - started}ms`);
    }

}

class DefaultFileTracker implements FileTracker, RecoveredFileTracker {
    private queue: TrackedBlock[] = [];
    private busy: boolean = false;
    private initialized: boolean = false;
    private batchSize: number = 5;
    private completedBlocks: Record<number, TrackedBlock> = {};
    private completed: boolean = false;
    // if this period has passed since the last batch, then we
    // can save available blocks even if batch is not full.
    // This ensures that we have enough blocks recovered even
    // on slower networks
    private maxBatchIntervalMillis = 5000;
    private lastBatchSavedAt: number;

    constructor(private manager: UploadRecoveryManager, private upload: TrackedFile, private logger?: Logger) {
        this.lastBatchSavedAt = Date.now();
    }

    /**
     * This should be called when tracking a new upload.
     * You can start tracking blocks before the returned
     * promise resolves.
     */
    async initNew(): Promise<void> {
        this.busy = true;
        const db = await this.manager.getDb();
        await db.put('files', this.upload);
        this.initialized = true;
        this.busy = false;
        this.saveNextBatchIfQueueEnough();
    }

    initRecovered() {
        this.initialized = true;
    }

    completeBlock(block: TrackedBlock) {
        this.queue.push(block);
        this.saveNextBatchIfQueueEnough();
    }

    async completeUpload(): Promise<void> {
        if (this.busy) {
            // what do we do here?
            // we should cancel any existing operation and
            // wait till we're no longer busy
        }
        this.busy = true;
        const db = await this.manager.getDb();
        await db.put('files', { ...this.upload, completed: true });
        await this.deleteBlocks();
        this.completed = true;
        this.busy = false;
    }

    async getS3PresignedBlocks() {
        if (this.upload.s3UploadId && this.upload.presignedBlocks) {
            return {
                s3UploadId: this.upload.s3UploadId,
                presignedBlocks: this.upload.presignedBlocks
            }
        }

        const db = await this.manager.getDb();
        const file = await db.get("files", this.upload.id);
        this.upload.s3UploadId = file?.s3UploadId;
        this.upload.presignedBlocks = file?.presignedBlocks;
        if (!file || !file.s3UploadId || !file.presignedBlocks) {
            return;
        }

        return {
            s3UploadId: file.s3UploadId,
            presignedBlocks: file.presignedBlocks
        };
    }

    async setS3PresignedBlocks(multipartUploadId: string, blocks: S3PresignedBlock[]) {
        this.upload.s3UploadId = multipartUploadId;
        this.upload.presignedBlocks = blocks;
        
        this.busy = true;
        const db = await this.manager.getDb();
        await db.put("files", { ...this.upload, s3UploadId: multipartUploadId, presignedBlocks: blocks });
        this.busy = false;
    }

    hasCompletedBlock(index: number): boolean {
        return index in this.completedBlocks;
    }

    getCompletedBlock(index: number): TrackedBlock {
        return this.completedBlocks[index];
    }

    async delete(): Promise<void> {
        if (this.busy) {
            // what do we do here?
            // we should cancel any existing operation and
            // wait till we're no longer busy
        }
        this.busy = true;
        await this.deleteFile();
        await this.deleteBlocks();
        this.busy = false;
    }

    private async deleteFile() {
        const started = Date.now();
        this.logger?.log('deleting file...');
        const db = await this.manager.getDb();
        const tx = db.transaction('files', 'readwrite');
        const files = tx.store;
        await files.delete(this.upload.id);
        await tx.done;
        this.logger?.log(`deleted file in ${Date.now() - started}ms`);
    }

    private async deleteBlocks() {
        this.logger?.log('deleting blocks');
        const started = Date.now();
        const db = await this.manager.getDb();
        const tx = db.transaction('blocks', 'readwrite');
        const blocks = tx.store;
        // TODO as an optimization for the best (general) case
        // we should clear the store if there are no more files (i.e. the sole file was deleted)
        let cursor = await blocks.openCursor();
        while (cursor) {
            if (cursor.value.file === this.upload.id) {
                await cursor.delete();
            }
    
            cursor = await cursor.continue();
        }
        await tx.done;
        this.logger?.log(`deleted blocks in ${Date.now() - started}ms`);
    }

    private async saveNextBatchIfQueueEnough() {
        if (this.busy || this.queue.length === 0) return;

        if (this.queue.length >= this.batchSize || (Date.now() - this.lastBatchSavedAt) > this.maxBatchIntervalMillis) {
            this.saveNextBatch();
        }
    }

    private async saveNextBatch(): Promise<void> {
        this.ensureInitialized();
        this.busy = true;

        const db = await this.manager.getDb();
        const tx = db.transaction('blocks', 'readwrite');
        const store = tx.store;
        // popping the blocks from the end is more efficient
        // but it means we'll be writing newer blocks first
        // this could to more fragmentation in the blocks we save
        // popping the blocks from the beginning is less efficient
        // but means we're more likely to recover blocks in sequential order
        // TODO: compare both approaches
        const count = Math.min(this.batchSize, this.queue.length);
        const batch = this.queue.splice(0, count);
        // TODO: can these be added concurrently?
        for (const block of batch) {
            await store.put({ ...block, file: this.upload.id });
        }
    
        this.logger?.log(`persisted batch of ${batch.length} blocks`);
        await tx.done;
        this.lastBatchSavedAt = Date.now();
        this.busy = false;
    }


    private ensureInitialized() {
        if (!this.initialized) throw new Error("Upload tracker was used before it was initialized.");
    }
}

export interface TransferInitRecoveryResult {
    completedFiles: Map<string, TrackedFile>;
    inProgressFiles: Map<string, {
        file: TrackedFile,
        completedBlocks: Map<number, TrackedBlock>
    }>;
}

export interface TrackedFile {
    id: string;
    transfer: string;
    filename: string;
    size: number;
    blockSize: number;
    // TODO: make this required in future version
    completed?: boolean;
    // this is required for S3 only, it represents the multipart upload id
    s3UploadId?: string;
    presignedBlocks?: S3PresignedBlock[]
}

export interface TrackedTransfer {
    id: string,
    name: string,
    blockSize: number,
    totalSize: number,
    files: { path: string, size: number }[],
    directories: { name: string, totalSize: number, totalFiles: number }[]
}

export interface TrackedBlock {
    // for S3, this corresponds to the ETag. For AZ, the ids are generated client-side.
    id: string;
    // for Azure the indices start from 0, for S3 the indices start from 1 and correspond to the part numbers
    index: number;
}

export interface S3PresignedBlock {
    /**
     * This is actual the part number, not the array index. Part numbers start from 1.
     * So to get the corresponding index in the file's block sequence,
     * subtract 1, i.e. let arrayIndex = block.index - 1
     */
    index: number;
    size: number;
    url: string;
}