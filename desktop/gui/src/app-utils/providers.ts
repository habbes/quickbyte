import { ensure } from "@quickbyte/common";
import { trpcClient } from "./api.js";

export async function getPreferredProvider() {
    const providers = await trpcClient().getStorageProviders.query();
    // TODO: only Azure is supported at the moment
    const provider = ensure(providers.find(p => p.name == "az"), "Could not find support provider");
    const latencyResults = await compareLatency(provider.availableRegions);
    const result = {
        provider: provider.name,
        bestRegions: latencyResults.map(r => r.region)
    };

    return result;
}

async function compareLatency(regions: RegionInfo[]): Promise<RegionPingResult[]> {
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
    
    await res.text();
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
