import { ref } from 'vue';
import type { 
    UserWithAccount,
    SubscriptionAndPlan,
    UserInviteWithSender,
    WithRole,
    Project
} from "@quickbyte/common";
import type { StorageProvider, PreferredProviderRegionResult, TrackedTransfer } from '@/core';
import { findBestProviderAndRegion, getCachedPreferredProviderRegion, clearPrefs, getIpLocation } from '@/core';
import { apiClient, trpcClient } from './api';
import { uploadRecoveryManager } from './recovery-manager';

const userAccount = ref<UserWithAccount>();
const providers = ref<StorageProvider[]>([]);
const preferredProvider = ref<PreferredProviderRegionResult>();
const recoveredTransfers = ref<TrackedTransfer[]>([]);
const deviceData = ref<DeviceData>();
const invites = ref<UserInviteWithSender[]>([]);
const projects = ref<WithRole<Project>[]>([]);

export async function initUserData() {
    const data = await trpcClient.getCurrentUserData.query();
    console.log('data', data);
    userAccount.value = data.user;
    invites.value = data.invites;
    projects.value = data.projects;
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

export function tryUpdateAccountSubscription(subscription: SubscriptionAndPlan) {
    if (store.userAccount.value
        && subscription
        && subscription.status === 'active'
    ) {
        store.userAccount.value.account.subscription = subscription;
    }
}

function removeInvite(inviteId) {
    const index = invites.value.findIndex(i => i._id === inviteId);
    if (index > -1) {
        invites.value.splice(index, 1);
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
    deviceData,
    invites,
    removeInvite
};
