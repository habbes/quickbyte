import { openDB, type IDBPDatabase } from 'idb';
import { ensure } from '.';
import { store } from '@/app-utils';

const VERSION = 1;
const DB_NAME = 'quickbyte';

export class UploadRecoveryManager {
    isReady: boolean;
    private whenReady: Promise<void>;
    private db: IDBPDatabase|undefined;
    private resolveReadyPromise: (() => void) | undefined;
    private rejectReadyPromise: ((e: Error) => void) | undefined;

    constructor() {
        this.isReady = false;
        this.whenReady = new Promise((resolve, reject) => {
            this.resolveReadyPromise = resolve;
            this.rejectReadyPromise = reject;
        });
    }

    async init(): Promise<void> {
        // TODO: define DB schema
        // TODO: handle errors
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

                tasks.then(() => console.log('complete creating object stores'));
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
        const tracker = new UploadTracker(this, upload);
        tracker.init();
        return tracker;
    }

    getRecoveredUploads(): Promise<TrackedUpload[]> {
        return Promise.reject('Not implemented');
    }
}

export class UploadTracker {
    private queue: TrackedBlock[] = [];
    private busy: boolean = false;
    private initialized: boolean = false;
    private batchSize: number = 5;

    constructor(private manager: UploadRecoveryManager, private upload: TrackedUpload) {
    }

    async init(): Promise<void> {
        this.busy = true;
        const db = await this.manager.getDb();
        await db.put('files', this.upload);
        this.initialized = true;
        this.busy = false;
        this.saveNextBatchIfQueueEnough();
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

    private async deleteFile() {
        const started = Date.now();
        console.log('deleting file...');
        const db = await this.manager.getDb();
        const tx = db.transaction('files', 'readwrite');
        const files = tx.store;
        await files.delete(this.upload.id);
        await tx.done;
        console.log(`deleted file in ${Date.now() - started}ms`);
    }

    private async deleteBlocks() {
        console.log('deleting blocks');
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
        console.log(`deleted blocks in ${Date.now() - started}ms`);
    }

    private async saveNextBatchIfQueueEnough() {
        // TODO we should probably also have max interval between
        // batches so that save small batches when queue
        // fills up too slowly (e.g. slow networks)
        if (this.queue.length >= this.batchSize && !this.busy) {
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
        console.log('persisted batch', batch);
        await tx.done;
        this.busy = false;
    }


    private ensureInitialized() {
        if (!this.initialized) throw new Error("Upload tracker was used before it was initialized.");
    }
}

interface TrackedUpload {
    id: string;
    filename: string;
    size: number;
    blockSize: number;
    hash: string;
}

interface TrackedBlock {
    id: string;
    index: number;
}