import { ConcurrentTaskQueue } from "@quickbyte/common";

export class BackgroundWorker {
    private readonly queue: ConcurrentTaskQueue;
    constructor(private readonly config: BackgroundWorkerConfig) {
        this.queue = new ConcurrentTaskQueue(config.concurrency);
    }

    queueJob(job: () => Promise<void>) {
        this.queue.addTask(job);
    }
}

export interface BackgroundWorkerConfig {
    concurrency: number;
}
