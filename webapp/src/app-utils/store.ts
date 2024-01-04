import { ref } from 'vue';
import type { StorageProvider, UserAccount, PreferredProviderRegionResult, TrackedTransfer, Subscription } from '@/core';
import { findBestProviderAndRegion, getCachedPreferredProviderRegion, clearPrefs, getIpLocation } from '@/core';
import { apiClient, trpcClient } from './api';
import { uploadRecoveryManager } from './recovery-manager';

type QueryValue<T extends (...args: any) => any> = Awaited<ReturnType<T>>;
const userAccount = ref<QueryValue<typeof trpcClient.getCurrentUserData.query>|undefined>();
const providers = ref<StorageProvider[]>([]);
const preferredProvider = ref<PreferredProviderRegionResult>();
const recoveredTransfers = ref<TrackedTransfer[]>([]);
const deviceData = ref<DeviceData>();

export async function initUserData() {
    const user = await trpcClient.getCurrentUserData.query();
    userAccount.value = user;
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

    const transfers = await uploadRecoveryManager.getRecoveredTransfers();
    recoveredTransfers.value = transfers;

    await getDeviceData();
}

export async function getDeviceData() {
    deviceData.value = await getIpLocation();
    deviceData.value.userAgent = navigator.userAgent;
    return deviceData.value;
}

export async function clearData() {
    userAccount.value = undefined;
    providers.value = [];
    preferredProvider.value = undefined;
    clearPrefs();
    await uploadRecoveryManager.clearRecoveredTransfers();
}

export function tryUpdateAccountSubscription(subscription: Subscription) {
    if (store.userAccount.value
        && subscription
        && subscription.status === 'active'
    ) {
        store.userAccount.value.account.subscription = subscription;
    }
}

interface DeviceData {
    ip: string;
    countryCode: string;
    userAgent?: string;
}

export const store = {
    userAccount,
    providers,
    preferredProvider,
    recoveredTransfers,
    deviceData
};
