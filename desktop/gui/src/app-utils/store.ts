import { ref, computed } from "vue";
import type { UserWithAccount, AccountWithSubscription, WithRole, Project } from "@quickbyte/common";
import { trpcClient } from "./api.js";
import {
    TransferJob,
    tryGetUserToken
} from "@/core";
import { deleteToken, setToken } from "./auth";
import { getPreferredProvider } from "./providers";

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

async function initUserData() {
    // TODO: error handling?
    const data = await trpcClient.getCurrentUserData.query();
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
    const token = await tryGetUserToken();
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
        console.log('Update transfers with', list);
        transfers.value = list;
    }
};

function signOutAndClearUserData() {
    deleteToken();
    user.value = undefined;
    accounts.value = [];
    projects.value = [];
    selectedProjectId.value = undefined;
}

type Store = typeof store;

export { store, initUserData, setCurrentProject, signOutAndClearUserData, tryLoadStoredUserSession, type Store };
