import { ref, computed } from "vue";
import { type UserWithAccount, type AccountWithSubscription, type WithRole, type Project, ensure } from "@quickbyte/common";
import { setTrpcUrl, setTrpcUserAgent, trpcClient } from "./api.js";
import {
    TransferJob,
    AppInfo,
    OsInfo,
    tryLoadPersistedUserToken,
    deletePersistedUserToken,
    getAppInfo as requestAppInfo,
    getOsInfo,
computeUserAgent
} from "@/core";
import { deleteToken, setToken } from "./auth";
import { getPreferredProvider } from "./providers";

const appInfo = ref<{ app: AppInfo, os: OsInfo }>();

const user = ref<UserWithAccount>();
const accounts = ref<AccountWithSubscription[]>([]);
const projects = ref<WithRole<Project>[]>([]);
const selectedProjectId = ref<string>();
const currentProject = computed(() => projects.value.find(p => p._id === selectedProjectId.value ));
const preferredProvider = ref<{
    provider: string;
    bestRegions: string[]
}>({
    provider: 'az',
    bestRegions: ['eastus']
});

const transfers = ref<TransferJob[]>([]);

const appUserAgent = computed(() => {
    if (!appInfo.value) {
        return "quickbyte-app=desktopTransfer";
    }

    return computeUserAgent(appInfo.value.app, appInfo.value.os);
});

async function loadAppInfo() {
    const [app, os] = await Promise.all([requestAppInfo(), getOsInfo()]);
    appInfo.value = { app, os };
    setTrpcUrl(`${app.serverBaseUrl}/trpc`);
    setTrpcUserAgent(computeUserAgent(app, os));
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

function getAppUserAgent() {
    return appUserAgent.value;
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

export { store, loadAppInfo, getAppInfo, getAppUserAgent, initUserData, setCurrentProject, signOutAndClearUserData, tryLoadStoredUserSession, type Store };
