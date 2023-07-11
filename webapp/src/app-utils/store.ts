import { ref } from 'vue';
import type { StorageProvider, UserAccount, PreferredProviderRegionResult } from '@/core';
import { findBestProviderAndRegion, getCachedPreferredProviderRegion, clearPrefs } from '@/core';
import { apiClient } from './api';

const userAccount = ref<UserAccount|undefined>();
const providers = ref<StorageProvider[]>([]);
const preferredProvider = ref<PreferredProviderRegionResult>();


export async function initUserData() {
    userAccount.value = await apiClient.getAccount();
    providers.value = await apiClient.getProviders();
    preferredProvider.value = {
        provider: providers.value[0].name,
        bestRegions: providers.value[0].availableRegions.map(r => r.id)
    }

    const cachedProvider = getCachedPreferredProviderRegion();
    if (cachedProvider) {
        preferredProvider.value = cachedProvider;
    } else {
        // this call takes long, so we don't wait for it,
        // but update the value when it's done
        findBestProviderAndRegion(providers.value)
            .then(result => preferredProvider.value = result);
    }
}

export function clearData() {
    userAccount.value = undefined;
    providers.value = [];
    preferredProvider.value = undefined;
    clearPrefs();
}

export const store = {
    userAccount,
    providers,
    preferredProvider
};
