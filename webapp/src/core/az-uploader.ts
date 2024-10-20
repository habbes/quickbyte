import { BlockBlobClient } from "@azure/storage-blob";
import type { FileTracker } from "./upload-recovery";
import type { Logger } from "./logger";
import type { TrpcApiClient } from "./trpc-client";

export type UploadProgressCallback = (progress: number) => any;

export type ConcurrencyStrategy =
    /**
     * A fixed number of workers is used to upload all the blocks.
     * Workers run in parallel. Blocks are distributed (almost) evenly
     * across the workers. This works better when uploading multiple files.
     */
    'fixedWorkers' |
    /**
     * All blocks are uploaded at the same time using Promise.all,
     * it's up to the browser to limit the number of concurrent
     * network requests. This works well when you're uploading
     * a single file.
     */
    'maxParallelism';

export interface FileUploaderArgs {
    file: File,
    uploadUrl: string,
    blockSize: number,
    tracker: FileTracker,
    onProgress: UploadProgressCallback,
    completedBlocks?: Map<number, Block>;
    logger?: Logger,
    /**
     * How to manage concurrent upload of individual
     * file blocks.
     */
    concurrencyStrategy: ConcurrencyStrategy,
    apiClient: TrpcApiClient;
    transferId: string,
    fileId: string,
}

export class AzUploader {
    private blob: BlockBlobClient;
    private progress: number = 0;
    private readonly concurrency:number = 5;

    constructor(private config: FileUploaderArgs) {
        this.blob = new BlockBlobClient(this.config.uploadUrl);
        this.concurrency = this.config.concurrencyStrategy === 'fixedWorkers' ? 5 : 16;
    }

    async uploadFile(): Promise<void> {
        if (this.config.completedBlocks) {
            this.addProgress(
                computeCompletedSize(
                    this.config.file.size,
                    this.config.blockSize,
                    this.config.completedBlocks
                )
            );
        }

        // We don't await this because we don't want to delay the upload,
        // we just want the server to update its status
        this.config.apiClient.initTransferFileUpload.mutate({
            transferId: this.config.transferId,
            fileId: this.config.fileId,
            blockSize: this.config.blockSize
        });

        const blob = new BlockBlobClient(this.config.uploadUrl);
        const numBlocks = Math.ceil(this.config.file.size / this.config.blockSize);
        const blockList = [];
        for (let i = 0; i < numBlocks; i++) {
            const recoveredBlock = this.getCompletedBlock(i);
            if (recoveredBlock) {
                blockList.push(recoveredBlock);
            } else {
                blockList.push({
                    index: i,
                    id: btoa(generateId(8))
                });
            }
        }

        const started = new Date();
        
        await this.uploadBlockList(blockList);

        // naive approach to network resiliency
        // TODO: we probably should not retry for all errors (e.g. it doesn't make sense to retry for an auth error)
        let retry = true;
        while (retry) {
            try {
                await blob.commitBlockList(blockList.map(b => b.id));
                retry = false;
            } catch (e) {
                this.config.logger?.error('error committing blocks', e);
                retry = true;
            }
        }

        // We retry this operation in case of network error, because
        // it triggers the server to start post-processing the uploaded
        // file
        retry = true;
        while (retry) {
            try {
                await this.config.apiClient.completeTransferFileUpload.mutate({
                    transferId: this.config.transferId,
                    fileId: this.config.fileId,
                    providerArgs: {}
                });

                retry = false;
            } catch (e) {
                this.config.logger?.error(`Error while marking file ${this.config.fileId} of transfer ${this.config.transferId} as complete`, e);
                if (e instanceof TypeError) {
                    retry = true;
                } else {
                    retry = false;
                }
            }
        }

        // We don't want to wait for the tracker to complete. This way,
        // other uploads in the queue can start without delay.
        this.config.tracker.completeUpload();
        const stopped = new Date();
        this.config.logger?.log(`Completed block list upload ${stopped.getTime() - started.getTime()}`);
    }

    private addProgress(blockProgress: number) {
        this.progress += blockProgress;
        this.config.onProgress(this.progress);
    }

    private async uploadBlockList(blockList: Block[]) {
        // TODO: benchmark to decide between different upload strategies
        // await this.uploadBlockListByIndependentWorkers(blockList);
        if (this.config.concurrencyStrategy === 'maxParallelism') {
            await this.uploadBlockListInParallel(blockList);
        } else if (this.config.concurrencyStrategy === 'fixedWorkers') {
            await this.uploadBlockListByIndependentWorkers(blockList);
        }
    }

    private async uploadBlockListInParallel(blockList: Block[]) {
        // TODO Promise.all() doesn't work for super huge files (e.g. 91gb)
        // So for now we just set many workers
        // this.config.logger?.log('parallel strategy');
        // await Promise.all(blockList.map(block => this.uploadBlock(block)));
        this.config.logger?.log('parallel workers strategy');
        // In this strategy, we have n workers
        // Each worker is responsible for uploading every kn + workerIndex block
        // e.g. if n = 5, worker 3 will upload blocks 3, 8, 13, etc.
        // The benefit is that we don't need to maintain a queue or synchronization between workers,
        // there's not contention between workers because there's no overlap
        // The downside is that workers that finish all their work first will
        const workers = new Array(this.concurrency);
        for (let i = 0; i < this.concurrency; i++) {
            workers[i] = this.runUploadWorker(i, blockList);
        }

        await Promise.all(workers);
    }

    private async uploadBlockListByIndependentWorkers(blockList: Block[]) {
        this.config.logger?.log('independent workers strategy');
        // In this strategy, we have n workers
        // Each worker is responsible for uploading every kn + workerIndex block
        // e.g. if n = 5, worker 3 will upload blocks 3, 8, 13, etc.
        // The benefit is that we don't need to maintain a queue or synchronization between workers,
        // there's not contention between workers because there's no overlap
        // The downside is that workers that finish all their work first will
        // remain idle even if there's still work to be done
        const workers = new Array(this.concurrency);
        for (let i = 0; i < this.concurrency; i++) {
            workers[i] = this.runUploadWorker(i, blockList);
        }

        await Promise.all(workers);
    }

    private async runUploadWorker(workerIndex: number, blockList: Block[]) {
        const totalWorkers = this.concurrency;
        let nextBlockIndex = workerIndex;
        while (nextBlockIndex < blockList.length) {
            // TODO: why workers start to disappear towards the end, despite available blocks
            if (!this.hasCompletedBlock(nextBlockIndex)) {
                const block = blockList[nextBlockIndex];
                await this.uploadBlock(block);
                this.config.tracker.completeBlock({
                    id: block.id,
                    index: block.index
                });
            }

            nextBlockIndex += totalWorkers;
        }
    }

    private async uploadBlock(block: Block) {
        const begin = block.index * this.config.blockSize;
        const end = begin + this.config.blockSize;
        const data = this.config.file.slice(block.index * this.config.blockSize, end);
        let lastUpdatedProgress = 0;
        // naive approach to ensure uploads are resilient to temporary network failures
        // we just keep retrying indefinitely
        let retry = true;
        while (retry) {
            try {
                await this.blob.stageBlock(block.id, data, data.size, {
                    onProgress: (progress) => {
                        // the event returns the bytes upload so far for this block
                        // so we have to deduct the updates we made to the progress in
                        // the last event to avoid duplicate updates
                        this.addProgress(progress.loadedBytes - lastUpdatedProgress)
                        lastUpdatedProgress = progress.loadedBytes;
                    }
                });

                retry = false;
            } catch (e) {
                this.config.logger?.error('error staging block', e);
                retry = true;
            }
        }
    }

    private hasCompletedBlock(index: number) {
        if (!this.config.completedBlocks) {
            return false;
        }

        return this.config.completedBlocks.has(index);
    }

    private getCompletedBlock(index: number): Block|undefined {
        if (!this.config.completedBlocks) {
            return;
        }

        return this.config.completedBlocks.get(index);
    }
}

function generateId(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = ' ';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

function computeCompletedSize(fileSize: number, blockSize: number, completedBlocks: Map<number, unknown>) {
    const numBlocks = Math.ceil(fileSize / blockSize);
    const lastBlockIndex = numBlocks - 1;
    const lastBlockSizeIfUneven = fileSize % blockSize;

    const hasLastBlock = completedBlocks.has(lastBlockIndex);
    const completedSize = hasLastBlock
        ? (completedBlocks.size - 1) * blockSize + lastBlockSizeIfUneven
        : completedBlocks.size * blockSize;
    
    return completedSize;
}

interface Block {
    index: number;
    id: string
}
