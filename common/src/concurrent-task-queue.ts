type Task = () => Promise<void>;

export class ConcurrentTaskQueue {
    private queue: Queue = new Queue;
    private workers: Worker[] = [];
    
    constructor(numWorkers: number) {
        for (let i = 0; i < numWorkers; i++) {
            this.workers.push(new Worker(this.queue));
        }
    }

    addTask(task: Task) {
        this.queue.enqueue(task);
        for (let worker of this.workers) {
            worker.signalWork();
        }
    }

    signalNoMoreTasks() {
        for (let worker of this.workers) {
            worker.signalStop();
        }
    }

    async waitForAllTasksToComplete() {
        const completionPromises = this.workers.map(worker => worker.waitToFinish());
        await Promise.all(completionPromises);
    }
}

class Worker {
    private completionPromise: Promise<void>;
    private resolvePromise: (() => void)|undefined;
    private terminationRequested = false;
    private isWorking = false;
    private status: 'pending'|'working'|'stopped'|'stopping' = 'pending';

    constructor(private readonly queue: ConsumerQueue) {
        this.completionPromise = new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    signalStop() {
        this.terminationRequested = true;
        this.status = 'stopping';
        if (!this.isWorking) {
            this.stopInternal();
        }
    }

    /**
     * Notify the worker that new tasks
     * have been added to the queue, just in case
     * it was idle
     */
    signalWork() {
        // TODO: could consider making the queue blocking (asynchronously) instead (i.e. making dequeue return a Promise than resolves
        // when a task is a available). But this approach makes it easy to terminate
        // the worker when it's idle
        if (this.terminationRequested) {
            throw new Error("Cannot accept new work while terminating...");
        }

        this.status = 'working';
        // if not currently working, trigger run loop
        if (!this.isWorking) {
            this.runWorkLoop();
        }
    }

    waitToFinish(): Promise<void> {
        return this.completionPromise;
    }

    private async runWorkLoop() {
        this.isWorking = true;
        this.status = 'working';
        while (!this.terminationRequested) {
            const task = this.queue.dequeue();
            if (task) {
                await task();
            } else {
                this.isWorking = false;
                // queue is empty.
                // stop loop until notified of new work
                // to avoid blockthing the thread on idle lopp
                break;
            }
        }

        if (this.terminationRequested) {
            this.stopInternal();
        }
    }

    private stopInternal() {
        if (this.status === 'stopped') {
            return;
        }

        if (this.isWorking) {
            throw new Error("Tried to stop worker while still working");
        }

        this.status = 'stopped';
        this.resolvePromise && this.resolvePromise();
    }
}

class Queue implements ConsumerQueue {
    private queue: Task[] = [];

    enqueue(task: Task) {
        this.queue.push(task);
    }

    dequeue(): Task|undefined {
        // TODO: not very efficient
        // compare with circular buffer or linked list
        return this.queue.shift();
    }

    length() {
        return this.queue.length;
    }
}

interface ConsumerQueue {
    dequeue(): Task|undefined;
    length(): number;
}
