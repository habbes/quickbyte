import { BlockBlobClient } from "@azure/storage-blob";
import type { UploadTracker } from "./upload-recovery";

export type UploadProgressCallback = (progress: number) => any;

type ProgressUpdater = (currentProgress: number) => number;

export async function concurrentFileUpload(file: File, uploadUrl: string, blockSize: number, tracker: UploadTracker, onProgress: UploadProgressCallback, startingProgress: number = 0) {
    let progress = startingProgress;
    const blob = new BlockBlobClient(uploadUrl);
    const numBlocks = Math.ceil(file.size / blockSize);
    const blockList = [];
    for (let i = 0; i < numBlocks; i++) {
        if (tracker.hasCompletedBlock(i)) {
            blockList.push(tracker.getCompletedBlock(i));
        } else {
            blockList.push({
                index: i,
                id: btoa(generateId(8))
            });
        }
    }

    const updateProgress = (newProgress: number) => {
        progress += newProgress;
        onProgress(progress);
    };

    const started = new Date();
    await uploadBlockList(blob, file, blockList, blockSize, tracker, updateProgress);

    // naive approach to network resiliency
    // TODO: we probably should not retry for all errors (e.g. it doesn't make sense to retry for an auth error)
    let retry = true;
    while (retry) {
        try {
            await blob.commitBlockList(blockList.map(b => b.id));
            retry = false;
        } catch (e) {
            console.error('error committing blocks', e);
            retry = true;
        }
    }

    const stopped = new Date();
    console.log("Completed block list upload", stopped.getTime() - started.getTime());
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

async function uploadBlockList(blob: BlockBlobClient, file: File, blockList: Block[], blockSize: number, tracker: UploadTracker, updateProgress: UploadProgressCallback) {
    // TODO: benchmark to decide between different upload strategies
    // await uploadBlockListUsingSequentialBatches(blob, file, blockList, blockSize);
    await uploadBlockListByIndependentWorkers(blob, file, blockList, blockSize, tracker, updateProgress);
}

async function uploadBlockListUsingSequentialBatches(blob: BlockBlobClient, file: File, blockList: Block[], blockSize: number, tracker: UploadTracker, updateProgress: UploadProgressCallback) {
    // In this strategy, uploads run in sequential batches
    // Each batch performs n concurrent uploads and we wait to conclude
    // a batch before starting the next one.
    // The downside is that each batch takes as long as the slowest task.
    // Other "workers" in the batch have to wait for the slowest one to complete
    // before the next batch can begin.
    // The upside is the relative simplicity of implementation
    const concurrency = 5;
    let current = 0;
    while (current < blockList.length) {
        const chunk = blockList.slice(current, current + concurrency);
        await Promise.all(chunk.map(block => {
            const task = uploadBlock(blob, file, block, blockSize, updateProgress);
            tracker.completeBlock(block);
            return task;
        }));
        current += concurrency;
    }
}

async function uploadBlockListByIndependentWorkers(blob: BlockBlobClient, file: File, blockList: Block[], blockSize: number, tracker: UploadTracker, updateProgess: UploadProgressCallback) {
    // In this strategy, we have n workers
    // Each worker is responsible for uploading every kn + workerIndex block
    // e.g. if n = 5, worker 3 will upload blocks 3, 8, 13, etc.
    // The benefit is that we don't need to maintain a queue or synchronization between workers,
    // there's not contention between workers because there's no overlap
    // The downside is that workers that finish all their work first will
    // remain idle even if there's still work to be done
    const concurrency = 5;
    const workers = new Array(concurrency);
    for (let i = 0; i < concurrency; i++) {
        workers[i] = runUploadWorker(i, concurrency, blob, file, blockList, blockSize, tracker, updateProgess);
    }

    await Promise.all(workers);
}

async function runUploadWorker(workerIndex: number, totalWorkers: number, blob: BlockBlobClient, file: File, blockList: Block[], blockSize: number, tracker: UploadTracker, updateProgress: UploadProgressCallback) {
    let nextBlockIndex = workerIndex;
    while (nextBlockIndex < blockList.length) {
        if (!tracker.hasCompletedBlock(nextBlockIndex)) {
            const block = blockList[nextBlockIndex];
            await uploadBlock(blob, file, block, blockSize, updateProgress);
            tracker.completeBlock({
                id: block.id,
                index: block.index
            });
        }
        nextBlockIndex += totalWorkers;
    }
}

async function uploadBlock(blob: BlockBlobClient, file: File, block: Block, blockSize: number, addProgress: UploadProgressCallback) {
    const begin = block.index * blockSize;
    const end = begin + blockSize;
    const data = file.slice(block.index * blockSize, end);
    let lastUpdatedProgress = 0;
    // naive approach to ensure uploads are resilient to temporary network failures
    // we just keep retrying indefinitely
    let retry = true;
    while (retry) {
        try {
            await blob.stageBlock(block.id, data, data.size, {
                onProgress: (progress) => {
                    // the event returns the bytes upload so far for this block
                    // so we have to deduct the updates we made to the progress in
                    // the last event to avoid duplicate updates
                    addProgress(progress.loadedBytes - lastUpdatedProgress)
                    lastUpdatedProgress = progress.loadedBytes;
                }
            });

            retry = false;
        } catch (e) {
            console.log('error staging block', e);
            retry = true;
        }
    }
}

interface Block {
    index: number;
    id: string
}