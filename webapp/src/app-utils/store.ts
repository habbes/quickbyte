import { computed, ref } from 'vue';
import { 
    type UserWithAccount,
    type SubscriptionAndPlan,
    type UserInviteWithSender,
    type WithRole,
    type Project,
    type AccountWithSubscription
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
const accounts = ref<AccountWithSubscription[]>([]);
const currentAccountId = ref<string>();
const currentAccount = computed(() => accounts.value.find(a => a._id === currentAccountId.value));

export async function initUserData() {
    const data = await trpcClient.getCurrentUserData.query();
    console.log('data', data);
    userAccount.value = data.user;
    invites.value = data.invites;
    projects.value = data.projects;
    accounts.value = data.accounts;
    currentAccountId.value = data.defaultAccountId;
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

function removeInvite(inviteId: string) {
    const index = invites.value.findIndex(i => i._id === inviteId);
    if (index > -1) {
        invites.value.splice(index, 1);
    }
}

function addProject(project: WithRole<Project>) {
    const index = projects.value.findIndex(p => p._id === project._id);
    if (index > -1) {
        // update existing project
        projects.value[index] = project;
        // force update detection
        projects.value = projects.value;
    } else {
        projects.value.push(project);
    }
}

function setCurrentAccount(id: string) {
    currentAccountId.value = id;
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
    projects,
    accounts,
    currentAccount,
    removeInvite,
    addProject,
    setCurrentAccount
};
