import type { StorageProvider } from './types.js';
import { compareLatency } from './util';

const PREFERRED_PROVIDER_KEY = 'preferredProvider';

export async function findBestProviderAndRegion(providers: StorageProvider[]): Promise<PreferredProviderRegionResult> {
    // for now we just pick the first provider
    const provider = providers[0];
    const latencyResults = await compareLatency(provider.availableRegions);

    const result = {
        provider: provider.name,
        bestRegions: latencyResults.map(r => r.region)
    };

    localStorage.setItem(PREFERRED_PROVIDER_KEY, JSON.stringify(result));

    console.log('found best provider', provider);
    return result;
}

export function getCachedPreferredProviderRegion(): PreferredProviderRegionResult|undefined {
    const pref = localStorage.getItem(PREFERRED_PROVIDER_KEY);
    if (!pref) return undefined;

    const result = JSON.parse(pref);
    console.log('found cached provider', result);
    return result;
}

export function clearPrefs() {
    localStorage.removeItem(PREFERRED_PROVIDER_KEY);
}

export interface PreferredProviderRegionResult {
    provider: string;
    bestRegions: string[]
}