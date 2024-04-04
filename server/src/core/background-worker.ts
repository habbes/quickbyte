import { ConcurrentTaskQueue } from "@quickbyte/common";

export class BackgroundWorker {
    private readonly queue: ConcurrentTaskQueue;
    constructor(private readonly config: BackgroundWorkerConfig) {
        this.queue = new ConcurrentTaskQueue(config.concurrency, error => {
            console.error(`Error occurred in queued job`, error);
        });
    }

    queueJob(job: () => Promise<unknown>) {
        this.queue.addTask(job);
    }
}

export interface BackgroundWorkerConfig {
    concurrency: number;
}
