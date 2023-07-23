import { openDB, type IDBPDatabase } from 'idb';
import { ensure } from '.';
import { Logger } from './logger';

const VERSION = 1;
const DB_NAME = 'quickbyte';
const FILES_STORE = 'files';
const BLOCKS_STORE = 'blocks';

interface RecoveryManagerArgs {
    onClear: () => unknown;
    onDelete: (uploadId: string) => unknown;
    logger?: Logger;
}

export class UploadRecoveryManager {
    isReady: boolean;
    private whenReady: Promise<void>;
    private db: IDBPDatabase|undefined;
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
        // TODO: define DB schema
        // TODO: handle errors
        const logger = this.args.logger;
        this.db = await openDB(DB_NAME, VERSION, {
            upgrade(db, oldVersion, newVesrsion) {
                const files = db.createObjectStore('files', {
                    keyPath: 'id'
                });
                
                const blocks = db.createObjectStore('blocks', {
                    keyPath: 'id'
                });

                const tasks = Promise.all([
                    files.transaction.done,
                    blocks.transaction.done
                ]);

                tasks.then(() => logger?.log('complete creating object stores'));
            }
        });

        this.isReady = true;
        ensure(this.resolveReadyPromise)();
    }

    async getDb(): Promise<IDBPDatabase> {
        await this.whenReady;
        return ensure(this.db);
    }

    createUploadTracker(upload: TrackedUpload): UploadTracker {
        const tracker = new DefaultUploadTracker(this, upload);
        tracker.initNew();
        return tracker;
    }

    recoverUploadTracker(upload: TrackedUpload): RecoveredUploadTracker {
        const tracker = new DefaultUploadTracker(this, upload);
        return tracker;
    }

    async getRecoveredUploads(): Promise<TrackedUpload[]> {
        await this.whenReady;
        const db = ensure(this.db);
        const files: TrackedUpload[] = await db.getAll(FILES_STORE);
        return files;
    }

    async deleteRecoveredUpload(id: string): Promise<void> {
        // since we just want to delete the file,
        // we only need the id
        const tracker = new DefaultUploadTracker(this, {
            id: id,
            blockSize: 0,
            filename: '',
            size: 0,
            hash: 'hash'
        });

       await tracker.deleteUpload();
       this.args.onDelete(id);
    }

    async clearRecoveredUploads(): Promise<void> {
        await this.whenReady;
        const db = ensure(this.db);
        const tx = db.transaction([FILES_STORE, BLOCKS_STORE], 'readwrite');
        const files = tx.objectStore(FILES_STORE);
        const blocks = tx.objectStore(BLOCKS_STORE);
        await Promise.all([files.clear(), blocks.clear()]);
        await tx.done;
        this.args.onClear();
    }
}

export interface UploadTracker {
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
     /**
     * Initializes the tracker and recovers completed blocks.
     * This method must be called and wait for the returned
     * promise to resolve before tracking new blocks.
     * **This must not be called for a new upload**
     */
     initRecovery(): Promise<InitRecoveryResult>
}

export interface RecoveredUploadTracker extends UploadTracker {
}

interface InitRecoveryResult {
    completedBlocks: Map<number, { id: string, index: number }>
}

class DefaultUploadTracker implements UploadTracker, RecoveredUploadTracker {
    private queue: TrackedBlock[] = [];
    private busy: boolean = false;
    private initialized: boolean = false;
    private batchSize: number = 5;
    private completedBlocks: Record<number, TrackedBlock> = {};
    // if this period has passed since the last batch, then we
    // can save available blocks even if batch is not full.
    // This ensures that we have enough blocks recovered even
    // on slower networks
    private maxBatchIntervalMillis = 5000;
    private lastBatchSavedAt: number;

    constructor(private manager: UploadRecoveryManager, private upload: TrackedUpload, private logger?: Logger) {
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

    /**
     * This should be called when tracking a recovered
     * upload. You should wait for the promise to resolve
     * before tracking any blocks.
     */
    async initRecovery(): Promise<InitRecoveryResult> {
        
        this.busy = true;
        const db = await this.manager.getDb();
        // TODO: should we index blocks by file id?
        // Ideally there should be no more than recovered upload
        const allBlocks = await db.getAll(BLOCKS_STORE);
        const fileBlocks = allBlocks.filter(b => b.file === this.upload.id);

        const completedBlocks = fileBlocks.reduce<Map<number, TrackedBlock>>((acc, block) => {
            acc.set(block.index, block);
            return acc;
            
        }, new Map<number, TrackedBlock>())

        this.initialized = true;
        this.busy = false;
        
        return {
            completedBlocks
        };
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
        await this.deleteFile();
        await this.deleteBlocks();
    }

    hasCompletedBlock(index: number): boolean {
        return index in this.completedBlocks;
    }

    getCompletedBlock(index: number): TrackedBlock {
        return this.completedBlocks[index];
    }

    async deleteUpload(): Promise<void> {
        if (this.busy) {
            // what do we do here?
            // we should cancel any existing operation and
            // wait till we're no longer busy
        }
        this.busy = true;
        await this.deleteFile();
        await this.deleteBlocks();
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
        for (let block of batch) {
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

export interface TrackedUpload {
    id: string;
    filename: string;
    size: number;
    blockSize: number;
    hash: string;
}

export interface TrackedBlock {
    id: string;
    index: number;
}