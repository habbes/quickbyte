// import { RegionInfo } from './types.js';

import { RestError } from "@azure/storage-blob";
import { json } from "stream/consumers";

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;
const BYTES_PER_TB = 1024 * BYTES_PER_GB;

/**
 * Utility function that does nothing
 */
export function noop() {};

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

export function pluralize(word: string, count: number, plural: string = '') {
    plural = plural || `${word}s`;
    // TODO handle special cases (e.g. directory -> directories)
    return count == 1 ? word : plural;
}

export function getFileExtension(fileName: string) {
    return fileName.split('.').at(-1);
}

export function ensure<T>(obj?: T, message?: string): T {
    if (!obj) throw new Error(message || 'Expected object to be defined.');
    return obj;
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
