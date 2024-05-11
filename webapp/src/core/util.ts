// import { RegionInfo } from './types.js';

import { RestError } from "@azure/storage-blob";

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;
const BYTES_PER_TB = 1024 * BYTES_PER_GB;

/**
 * Utility function that does nothing
 */
export function noop() { };

export function humanizeSize(bytes: number): string {
    if (bytes < BYTES_PER_KB) {
        return `${bytes} Bytes`;
    }

    if (bytes < BYTES_PER_MB) {
        const kbs = Math.ceil(bytes / BYTES_PER_KB);
        return `${kbs} KB`;
    }

    if (bytes < BYTES_PER_GB) {
        const mbs = Math.ceil(bytes / BYTES_PER_MB);
        return `${mbs} MB`;
    }

    if (bytes < BYTES_PER_TB) {
        const gbs = (bytes / BYTES_PER_GB).toLocaleString(undefined, { maximumFractionDigits: 2 });
        return `${gbs} GB`;
    }

    const tbs = (bytes / BYTES_PER_TB).toLocaleString(undefined, { maximumFractionDigits: 2 });;
    return `${tbs} TB`;
}

/**
 * Format the timestamp to a duration format mm:ss
 * @param timestamp Timestamp in seconds
 */
export function formatTimestampDuration(timestamp: number): string {
    // Convert milliseconds to seconds
    const seconds = Math.floor(timestamp);

    // Calculate minutes and remaining seconds
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
        // Format the duration as MM:SS
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function formatPercentage(value: number, total: number) {
    const percent = 100 * value / total;
    const formatted = `${percent.toFixed(2)}%`;
    return formatted;
}

export function pluralize(word: string, count: number, plural: string = '') {
    plural = plural || `${word}s`;
    // TODO handle special cases (e.g. directory -> directories)
    return count == 1 ? word : plural;
}

export function figureWithUnit(count: number, unit: string, plural: string = '') {
    return `${count} ${pluralize(unit, count, plural)}`;
}

export function getFileExtension(fileName: string) {
    return fileName.split('.').at(-1);
}

export function ensure<T>(obj?: T, message?: string): T {
    if (!obj) throw new Error(message || 'Expected object to be defined.');
    return obj;
}

/**
 * Returns true if the value is neither undefined nor null.
 * Notes: This also returns true when the value is 0 or an empty string.
 * @param value 
 */
export function isDefined(value?: any): boolean {
    return value !== undefined && value !== null;
}

export function getTransferDownloadUrl(id: string): string {
    return `${location.origin}/d/${id}`;
}

export async function executeTasksInBatches<TSource, TResult>(
    source: TSource[],
    createTask: (s: TSource) => Promise<TResult>,
    numWorkers: number
): Promise<TResult[]> {
    const result = new Array<TResult>(source.length);
    const workers = new Array<Promise<void>>(numWorkers);
    for (let w = 0; w < numWorkers; w++) {
        workers[w] = executeBatchWorker(w, numWorkers, source, createTask, result);
    }

    await Promise.all(workers);
    return result;
}

async function executeBatchWorker<TSource, TResult>(startIndex: number, numWorkers: number, taskSources: TSource[], createTask: (s: TSource) => Promise<TResult>, results: TResult[]) {
    let nextTaskIndex = startIndex;
    while (nextTaskIndex < taskSources.length) {
        const result = await createTask(taskSources[nextTaskIndex]);
        results[nextTaskIndex] = result;
        nextTaskIndex += numWorkers;
    }
}

export interface RetryOnFailureOptions {
    /**
     * A function that determines whether to retry the task for the specified error.
     * If it returns true, the job will not be retried and the error will be rethrown
     * instead.
     * @param err 
     */
    ignoreError?: (err: any) => boolean;
    /**
     * When set, it limits the maximum number of retries.
     * After the job has been retried max times, the next error will be rethrown.
     * @remarks retries are counted after the first failure.
     */
    maxRetryCount?: number;
}

export async function retryOnError<T>(job: () => Promise<T>, options?: RetryOnFailureOptions): Promise<T> {
    let retryCount = 0;
    while (true) {
        try {
            const result = await job();
            return result;
        } catch (e: any) {
            if (options && options.ignoreError && options.ignoreError(e)) {
                throw e;
            }

            if (options && options.maxRetryCount !== undefined && options.maxRetryCount === retryCount) {
                throw e;
            }

            retryCount++;
        }
    }
}

export function isNetworkError(e: any) {
    return !!(e.message &&
        (/network/.test(e.message) || /connection/.test(e.message) || /fetch/.test(e.message) || e instanceof RestError));
}

export async function compareLatency(regions: RegionInfo[]): Promise<RegionPingResult[]> {
    const concurrency = 4;
    const samples = 3;
    const tasks = [];
    for (let i = 0; i < samples; i++) {
        for (const region of regions) {
            tasks.push(region);
        }
    }

    const results: RegionPingResult[] = [];

    const workers = [];
    for (let workerIndex = 0; workerIndex < concurrency; workerIndex++) {
        const index = workerIndex;
        workers.push(pingWorker(index, concurrency, tasks, results));
    }

    await Promise.all(workers);
    const cleanResults = results.filter(r => r);

    const groupedResults = cleanResults.reduce<Record<string, RegionPingResult[]>>((groups, result) => {
        groups[result.region] = groups[result.region] || [];
        groups[result.region].push(result);
        return groups;
    }, {});

    const averageResults = Object.keys(groupedResults).map(region => ({
        region,
        duration: groupedResults[region].map(r => r.duration).reduce((a: number, b: number) => a + b) / groupedResults[region].length
    }));

    averageResults.sort((a, b) => a.duration - b.duration);
    return averageResults;
}

async function pingWorker(index: number, numWorkers: number, tasks: RegionInfo[], results: (RegionPingResult)[]) {
    let nextTask = index;
    while (nextTask < tasks.length) {
        // we define a const local copy of task to
        // avoid passing mutable nextTask to an async closure
        const taskIndex = nextTask;
        const duration = await pingRegion(tasks[taskIndex]);

        results.push({
            region: tasks[taskIndex].id,
            duration
        });

        nextTask += numWorkers;
    }
}

async function pingRegion(region: RegionInfo) {
    const started = Date.now();
    const res = await fetch(region.pingUrl, {
        mode: 'cors',
        // disable caching for this request, we want to
        // get the round-trip latency to the server each time
        cache: 'no-store'
    });
    const data = await res.text();
    const ended = Date.now();
    const duration = ended - started;
    return duration;
}

export async function getIpLocation(): Promise<{ ip: string, countryCode: string }> {
    const json = await retryOnError(async () => {
        const response = await fetch('https://jsonip.com');
        if (response.status !== 200) {
            throw new Error(await response.text())
        }

        const data = await response.json();
        return data;
    }, {
        maxRetryCount: 3
    });

    return {
        ip: json.ip,
        countryCode: json.country
    };
}

interface RegionPingResult {
    region: string,
    duration: number
}

interface RegionInfo {
    id: string;
    pingUrl: string;
}


type ClickHandler = (e: MouseEvent) => unknown;
export function splitClickAndDoubleClickHandler(onClick: ClickHandler, onDblClick: ClickHandler) {
    let clickCount = 0;
    let timeout: any = undefined;
    // the problem with this approach is that if the delay is
    // shorter than the user can register two clicks, we can't properly
    // detect double-clicks
    // if the delay is too long, the user notices a lag when single-clicking.
    // Find the right balance is not easy, and may not work for all users
    // Consider an alternative approach:
    // - handle single click immediately but ignore the next click that occurs within a delay
    // - register @click and @dblClick event handlers separately
    // - this can work for scenarios where it's okay for both a click and double click to be handled
    // at the "same time", but not okay to process the click event twice during a double click.
    const MAX_DBL_CLICK_DELAY = 200;

    return (event: MouseEvent) => {
        // we want to handle click and double-click events
        // separately.
        // If add both click and dblclick event listeners,
        // each click of the double click event will also trigger
        // the click handler, so we'll have 3 triggers.
        // To avoid that, we listen to click events and wait
        // a delay to see if another click happens
        clickCount++;
        let timer: any = undefined;
        if (clickCount === 1) {
            // first click, wait to see if another
            // click will occur shortly
            timer = setTimeout(() => {
                // no other click occurred, consider a single-click event
                clickCount = 0;
                onClick(event);
            }, MAX_DBL_CLICK_DELAY);
        } else if (clickCount === 2) {
            // another click occurred before the deadline
            // handle as double click and reset
            clearTimeout(timeout);
            clickCount = 0;
            onDblClick(event);
        }
    }
}

/**
 * Utility helper for detecting and distinguishing between short and long events,
 * e.g. between short clicks or taps and long presses.
 * Returns a set of handler functions that should be registered to the
 * target element's start events (e.g. mousedown, touchstart) and stop events (mouseup, touchend). The utility
 * will take care of calling either the onShortEvent or onLongEvent handler
 * passed as arguments based on a configuration delay threshold
 * @param onShortEvent 
 * @param onLongEvent 
 * @param options 
 */
export function splitShortAndLongEventHandler<TEvent>(
    onShortEvent: (event: TEvent) => unknown,
    onLongEvent: (event: TEvent) => unknown,
    options?: { longClickThreshold?: number }
) {
    let clickStart = 0;
    const longClickThreshold = options?.longClickThreshold || 500;

    function handleEventStart(event: TEvent) {
        clickStart = Date.now();
    }

    function handleEventEnd(event: TEvent) {
        const duration = Date.now() - clickStart;
        if (duration <= longClickThreshold) {
            onShortEvent(event);
        }
        else {
            onLongEvent(event);
        }
    }

    return {
        handleEventStart,
        handleEventEnd
    }
}

export function throttle<T extends any[]>(fn: (...args: T) => unknown, delay: number) {
    let lastCall = 0;
    return (...args: Parameters<typeof fn>) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            fn(...args);
            lastCall = now;
        }
    }
}

export function debounce<T extends any[]>(fn: (...args: T) => unknown, delay: number) {
    let timeoutId: any;
    return function (...args: Parameters<typeof fn>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

export function unwrapSingleton<T>(value: T | T[]): T {
    return Array.isArray(value) ? value[0] : value;
}