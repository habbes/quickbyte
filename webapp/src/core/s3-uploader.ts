import type { FileTracker, S3PresignedBlock } from "./upload-recovery";
import type { Logger } from "./logger";
import type { TrpcApiClient } from "./trpc-client";
import { executeTasksInBatches } from "@quickbyte/common";

export type UploadProgressCallback = (progress: number) => any;

interface Block {
    index: number;
    id: string
}

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

export interface S3FileUploadArgs {
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
    apiClient: TrpcApiClient,
    transferId: string,
    fileId: string,
}

export class S3Uploader {
    private progress: number = 0;
    private readonly concurrency: number = 5;

    constructor(private config: S3FileUploadArgs) {
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
            )
        }
        
        const started = new Date();
        // if this is a recovered upload, then we need to get the id and blocks from the tracker
        
        const initUploadResult = await this.config.apiClient.initTransferFileUpload.mutate({
            transferId: this.config.transferId,
            fileId: this.config.fileId,
            blockSize: this.config.blockSize
        });

        // TODO: we need to track the uploadId
        let presignedBlocks: S3PresignedBlock[];
        let uploadId: string;
        const recoveredUpload = await this.config.tracker.getS3PresignedBlocks();
        if (recoveredUpload) {
            uploadId = recoveredUpload.s3UploadId;
            presignedBlocks = recoveredUpload.presignedBlocks;
        } else {
            if (!initUploadResult.uploadId) {
                this.config.logger?.error(
                    `Failed to get mulitpart upload id for file '${this.config.fileId}' of transfer '${this.config.transferId}'`);
                throw new Error("Failed to initiate upload");
            }

            uploadId = initUploadResult.uploadId
            presignedBlocks = initUploadResult.blocks;
        }


        this.config.tracker.setS3PresignedBlocks(uploadId, presignedBlocks);
        
        const uploadedBlocks = await this.uploadBlockList(presignedBlocks);

        let retry = true;
        while (retry) {
            try {
                await this.config.apiClient.completeTransferFileUpload.mutate({
                    transferId: this.config.transferId,
                    fileId: this.config.fileId,
                    uploadId: uploadId,
                    blocks: uploadedBlocks
                });

                retry = false;
            } catch (e: any) {
                this.config.logger?.error('error committing blocks', e);
                if (e instanceof TypeError) {
                    retry = true;
                } else {
                    retry = false;
                }
            }
        }

        // We don't want to wait for the tracker to complete. So fire and forget.
        this.config.tracker.completeUpload();
        const stopped = new Date();
        this.config.logger?.log(`Completed az multipart upload ${stopped.getTime() - started.getTime()}`);
    }

    private addProgress(blockProgress: number) {
        this.progress += blockProgress;
        this.config.onProgress(this.progress);
        console.log('added progress', this.progress);
    }

    private uploadBlockList(blockList: S3PresignedBlock[]) {
        return executeTasksInBatches(blockList, block => this.tryUploadAndTrackBlock(block), this.concurrency);;
    }

    private async tryUploadAndTrackBlock(block: S3PresignedBlock) {
        if (this.hasCompletedBlock(block.index)) {
            const completedBlock = this.getCompletedBlock(block.index)!;
            return {
                index: completedBlock.index,
                etag: completedBlock.id
            };
        }

        const result = await this.uploadBlock(block);
        if (result.etag) {
            this.config.tracker.completeBlock({
                id: result.etag,
                index: block.index
            });
        }

        return result;
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

    private async uploadBlock(block: S3PresignedBlock) {
        const seqIndex = block.index - 1;
        // TODO: we can compute this on the server instead
        const begin = seqIndex * this.config.blockSize;
        const end = begin + block.size;
        const data = this.config.file.slice(begin, end);
        let lastUpdateProgress = 0;

        let retry = true;
        while (retry) {
            try {
                // how to check progress
                const response = await fetch(block.url, {
                    method: 'PUT',
                    body: data,
                    headers: {
                        "Content-Length": `${data.size}`
                    }
                });
                
                const etag = response.headers.get("ETag") || response.headers.get("Etag") || response.headers.get("etag");
                if (!etag) {
                    this.config.logger?.error(`ETag not returned for block ${block.index} of file ${this.config.fileId}`);
                    break;
                }

                this.addProgress(block.size - lastUpdateProgress);
                lastUpdateProgress = data.size;
                retry = false;
                return {
                    index: block.index,
                    etag: etag
                };
            } catch (e: any) {
                this.config.logger?.error(`error staging block ${block.index} for file '${this.config.fileId}' in transfer '${this.config.transferId}': ${e.message}`, e);
                retry = true;
            }
        }

        this.config.logger?.error(
            `Reached unexpected end of function when processing ${block.index} in file ${this.config.fileId}`);
        throw new Error("Unexpected error occur");
    }
}

function computeCompletedSize(fileSize: number, blockSize: number, completedBlocks: Map<number, unknown>) {
    const numBlocks = Math.ceil(fileSize / blockSize);
    const lastBlockIndex = numBlocks;
    const lastBlockSizeIfUneven = fileSize % blockSize;

    const hasLastBlock = completedBlocks.has(lastBlockIndex);
    const completedSize = hasLastBlock
        ? (completedBlocks.size - 1) * blockSize + lastBlockSizeIfUneven
        : completedBlocks.size * blockSize;
    
    return completedSize;
}
