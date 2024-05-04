/**
 * A utility that helps to keep track and get notified
 * when a series of asynchronous tasks have completed when you
 * don't know in advance how many tasks will run.
 */
export class TaskTracker {
    private runningTasks: number = 0;
    private noMoreTasks: boolean = false;
    private completionPromise: Promise<void>;
    private resolvePromise: (() => void)|undefined = undefined;
    private rejectPromise: ((error: Error) => void)|undefined = undefined;

    constructor(private logger?: { error(message: string): void}) {
        this.completionPromise = new Promise<void>((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
        });
    }

    /**
     * This method should be called before each asynchronous task is started.
     * All calls to this method should ideally happen synchronously, linearly.
     * In order to guarantee correct execution, the last call to startTask()
     * should happen before the call to signalNoMoreTasks(), otherwise
     * the promise might be triggered before all tasks have been completed.
     */
    startTask() {
        this.runningTasks++;
    }

    /**
     * Signals that a task has been completed. Each call to `completeTask()`
     * should match a previous call to `startTask()`. I.e., `completeTask()`
     * should be called as many times as `startTask()`, otherwise
     * the promise might never be triggered.
     */
    completeTask() {
        this.runningTasks--;
        this.completeIfDone();
    }

    /**
     * Signals that no more tasks will be called.
     * This should be called after the last call to `startTask()`
     * has happened, otherwise the promise might be triggered
     * before all tasks have finished.
     */
    signalNoMoreTasks() {
        this.noMoreTasks = true;
        this.completeIfDone();
    }

    /**
     * Returns  a promise that will resolve when all tasks have finished.
     */
    waitForTasksToComplete() {
        return this.completionPromise;
    }

    private completeIfDone() {
        if (this.runningTasks === 0 && this.noMoreTasks) {
            this.resolvePromise && this.resolvePromise();
        }

        if (this.runningTasks < 0) {
            this.logger?.error(`Task tracker has reached an invalid state of ${this.runningTasks} running tasks. This is a logical error.`);
            this.rejectPromise && this.rejectPromise(new Error("Invalid state error occured. Please try the operation again."));
        }
    }
}