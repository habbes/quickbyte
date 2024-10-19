import { ref, computed } from "vue";
import { type UserWithAccount, type AccountWithSubscription, type WithRole, type Project, ensure } from "@quickbyte/common";
import { setTrpcUrl, trpcClient } from "./api.js";
import {
    TransferJob,
    AppInfo,
    tryLoadPersistedUserToken,
    deletePersistedUserToken,
    getAppInfo as requestAppInfo
} from "@/core";
import { deleteToken, setToken } from "./auth";
import { getPreferredProvider } from "./providers";


const appInfo = ref<AppInfo>();

const user = ref<UserWithAccount>();
const accounts = ref<AccountWithSubscription[]>([]);
const projects = ref<WithRole<Project>[]>([]);
const selectedProjectId = ref<string>();
const currentProject = computed(() => projects.value.find(p => p._id === selectedProjectId.value ));
const preferredProvider = ref<{
    provider: string;
    bestRegions: string[]
}>({
    provider: 'name',
    bestRegions: ['eastus']
});

const transfers = ref<TransferJob[]>([]);

async function loadAppInfo() {
    const info = await requestAppInfo();
    setTrpcUrl(`${info.serverBaseUrl}/trpc`);
    appInfo.value = info;
}

function getAppInfo() {
    return ensure(appInfo.value, 'Could not read app info. Ensure app info has been loaded first.');
}

async function initUserData() {
    // TODO: error handling?
    const data = await trpcClient().getCurrentUserData.query();
    user.value = data.user;
    accounts.value = data.accounts;
    projects.value = data.projects;
    if (projects.value.length) {
        selectedProjectId.value = data.defaultProjectId || projects.value[0]._id;
    }

    getPreferredProvider().then(result => {
        console.log('preferred provider', result);
        preferredProvider.value = result;
    });

    return data;
}

async function tryLoadStoredUserSession() {
    const token = await tryLoadPersistedUserToken();
    console.log('obtained token from store', token);
    if (!token) {
        return;
    }

    setToken(token);
    await initUserData();
}

function setCurrentProject(projectId: string) {
    selectedProjectId.value = projectId;
}

const store = {
    user,
    projects,
    accounts,
    currentProject,
    selectedProjectId,
    transfers,
    preferredProvider,
    addTransfer(transfer: TransferJob) {
        transfers.value.push(transfer)
    },
    setTransfers(list: TransferJob[]) {
        transfers.value = list;
    },
    deleteTransfer(transferId: string) {
        const index = transfers.value.findIndex(t => t._id === transferId);
        if (index < 0) return;
        transfers.value.splice(index, 1);
    }
};

async function signOutAndClearUserData() {
    deleteToken();
    user.value = undefined;
    accounts.value = [];
    projects.value = [];
    selectedProjectId.value = undefined;
    deletePersistedUserToken();
}

type Store = typeof store;

export { store, loadAppInfo, getAppInfo, initUserData, setCurrentProject, signOutAndClearUserData, tryLoadStoredUserSession, type Store };
