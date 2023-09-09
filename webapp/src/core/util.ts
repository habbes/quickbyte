// import { RegionInfo } from './types.js';

import { RestError } from "@azure/storage-blob";

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1024 * 1024 * 1024;
const BYTES_PER_TB = 1024 * BYTES_PER_GB;

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

export function getFileExtension(fileName: string) {
    return fileName.split('.').at(-1);
}

export function ensure<T>(obj?: T, message?: string): T {
    if (!obj) throw new Error(message || 'Expected object to be defined.');
    return obj;
}

export async function executeTasksInBatches<TSource, TResult>(
    source: TSource[],
    createTask: (s: TSource) => Promise<TResult>,
    batchSize: number
): Promise<TResult[]> {
    let nextBatchIndex = 0;
    const result = new Array<TResult>(source.length);
    while (nextBatchIndex < source.length) {
        const batch = source.slice(nextBatchIndex, nextBatchIndex + batchSize);
        const batchTasks = batch.map(s => createTask(s));
        const batchResult = await Promise.all(batchTasks);
        
        for (let i = 0; i < batchResult.length; i++) {
            result[nextBatchIndex + i] = batchResult[i];
        }

        nextBatchIndex += batchSize;
    }

    return result;
}

export function isNetworkError(e: any) {
    return !!(e.message &&
        (/network/.test(e.message) || /connection/.test(e.message) || /fetch/.test(e.message) || e instanceof RestError));
}

export async function compareLatency(regions: RegionInfo[]): Promise<RegionPingResult[]> {
    const started = Date.now();
    const concurrency = 4;
    const samples = 3;
    const tasks = [];
    for (let i = 0; i < samples; i++) {
        for (let region of regions) {
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

interface RegionPingResult {
    region: string,
    duration: number
}

interface RegionInfo {
    id: string;
    pingUrl: string;
}
