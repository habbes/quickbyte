import { S3Client, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import type { FileTracker } from "./upload-recovery";
import type { Logger } from "./logger";
import type { TrpcApiClient } from "./trpc-client";

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
}

export class S3Uploader {
    private client: S3Client;

    constructor(private config: S3FileUploadArgs) {
        this.client = new S3Client({});
    }

    async uploadFile(): Promise<void> {
        if (this.config.completedBlocks) {
            // TODO: update progress of completed blocks
        }

        
    }
}