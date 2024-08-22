import { ref, computed } from "vue";
import type { UserWithAccount, AccountWithSubscription, WithRole, Project } from "@quickbyte/common";
import { trpcClient } from "./api.js";

const user = ref<UserWithAccount>();
const accounts = ref<AccountWithSubscription[]>([]);
const projects = ref<WithRole<Project>[]>([]);
const selectedProjectId = ref<string>();
const currentProject = computed(() => projects.value.find(p => p._id === selectedProjectId.value ));


async function initUserData() {
    // TODO: error handling?
    const data = await trpcClient.getCurrentUserData.query();
    user.value = data.user;
    accounts.value = data.accounts;
    projects.value = data.projects;
    if (projects.value.length) {
        selectedProjectId.value = data.defaultProjectId || projects.value[0]._id;
    }

    return data;
}

function setCurrentProject(projectId: string) {
    selectedProjectId.value = projectId;
}

const store = {
    user,
    projects,
    accounts,
    currentProject
};


export { store, initUserData, setCurrentProject };
