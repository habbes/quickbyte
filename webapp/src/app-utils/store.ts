import { computed, ref } from 'vue';
import { 
    type User,
    type SubscriptionAndPlan,
    type RecipientInvite,
    type WithRole,
    type Project,
    type AccountWithSubscription
} from "@quickbyte/common";
import type { StorageProvider, PreferredProviderRegionResult, TrackedTransfer } from '@/core';
import { findBestProviderAndRegion, getCachedPreferredProviderRegion, clearPrefs, getIpLocation } from '@/core';
import { apiClient, trpcClient } from './api';
import { uploadRecoveryManager } from './recovery-manager';
import { logger } from './logger';
import { auth } from '.';

// while the user we get from the server actually has account and subscription info of
// the user's personal account, here I opted to user the basic User type instead of the
// complete UserWithAccount to avoid accidentally using the user's personal account
// instead of the currently selected account (store.currentAccount) when I
// added support for multiple accounts.
// Consider using the full account if we need to specifically access the user's personal account
const user = ref<User>();
const providers = ref<StorageProvider[]>([]);
const preferredProvider = ref<PreferredProviderRegionResult>();
const recoveredTransfers = ref<TrackedTransfer[]>([]);
const deviceData = ref<DeviceData>();
const invites = ref<RecipientInvite[]>([]);
const projects = ref<WithRole<Project>[]>([]);
const accounts = ref<AccountWithSubscription[]>([]);
const currentAccountId = ref<string>();
const currentAccount = computed(() => accounts.value.find(a => a._id === currentAccountId.value));
const currentProjects = computed(() => projects.value.filter(p => p.accountId === currentAccount.value?._id));

export async function initUserData() {
    try {
        const data = await trpcClient.getCurrentUserData.query();
        logger.log('data', data);
        user.value = data.user;
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
    } catch (e: any) {
        logger?.error(e.message, e);
        if (/signed in/.test(e.message)) {
            // auth has expired, clear data so the user
            // can sign in again
            clearData();
        } else {
            throw e;
        }
    }
}

export async function getDeviceData() {
    deviceData.value = await getIpLocation();
    deviceData.value.userAgent = navigator.userAgent;
    return deviceData.value;
}

export async function clearData() {
    user.value = undefined;
    providers.value = [];
    preferredProvider.value = undefined;
    auth.clearLocalSession();
    clearPrefs();
    await uploadRecoveryManager.clearRecoveredTransfers();
}

export function tryUpdateAccountSubscription(subscription: SubscriptionAndPlan) {
    if (store.currentAccount.value
        && subscription
        && subscription.status === 'active'
    ) {
        store.currentAccount.value.subscription = subscription;
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
    user: user,
    providers,
    preferredProvider,
    recoveredTransfers,
    deviceData,
    invites,
    projects,
    currentProjects,
    accounts,
    currentAccount,
    removeInvite,
    addProject,
    setCurrentAccount
};
