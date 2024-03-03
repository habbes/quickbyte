import type { StorageProvider } from './types.js';
import { compareLatency, ensure } from './util';

const PREFERRED_PROVIDER_KEY = 'preferredProvider';

export async function findBestProviderAndRegion(providers: StorageProvider[]): Promise<PreferredProviderRegionResult> {
    // TODO Fror now we pick Azure until we've completed implementation of AWS support
    const provider = ensure(providers.find(p => p.name === "az"), "az provider not found");
    const latencyResults = await compareLatency(provider.availableRegions);

    const result = {
        provider: provider.name,
        bestRegions: latencyResults.map(r => r.region)
    };

    localStorage.setItem(PREFERRED_PROVIDER_KEY, JSON.stringify(result));

    return result;
}

export function getCachedPreferredProviderRegion(): PreferredProviderRegionResult|undefined {
    const pref = localStorage.getItem(PREFERRED_PROVIDER_KEY);
    if (!pref) return undefined;

    const result = JSON.parse(pref);
    return result;
}

export function clearPrefs() {
    localStorage.removeItem(PREFERRED_PROVIDER_KEY);
}

export interface PreferredProviderRegionResult {
    provider: string;
    bestRegions: string[]
}