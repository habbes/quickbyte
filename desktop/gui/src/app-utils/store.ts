import { ref, computed } from "vue";
import type { UserWithAccount, AccountWithSubscription, WithRole, Project } from "@quickbyte/common";
import { trpcClient } from "./api.js";
import {
    TransferJob,
    JobStatus,
} from "@/core";

const user = ref<UserWithAccount>();
const accounts = ref<AccountWithSubscription[]>([]);
const projects = ref<WithRole<Project>[]>([]);
const selectedProjectId = ref<string>();
const currentProject = computed(() => projects.value.find(p => p._id === selectedProjectId.value ));


// Helper function to generate a random status
function getRandomStatus(): JobStatus {
    const statuses: JobStatus[] = ['pending', 'completed', 'cancelled', 'error', 'progress'];
    return statuses[Math.floor(Math.random() * statuses.length)];
}

// Sample data
const sampleTransfers: TransferJob[] = [
    {
        _id: '1',
        name: 'Upload Job 1',
        totalSize: 5000000,
        completedSize: 2500000,
        numFiles: 10,
        status: getRandomStatus(),
        type: 'upload'
    },
    {
        _id: '2',
        name: 'Download Job 1',
        totalSize: 10000000,
        completedSize: 10000000,
        numFiles: 5,
        status: 'completed',
        type: 'download',
        files: {
            _id: 'file1',
            name: 'File 1',
            size: 2000000,
            completedSize: 2000000,
            remoteUrl: 'https://example.com/file1',
            localPath: '/local/path/file1',
            status: 'completed'
        }
    },
    {
        _id: '3',
        name: 'Download Job 2',
        totalSize: 15000000,
        completedSize: 7500000,
        numFiles: 8,
        status: getRandomStatus(),
        type: 'download',
        files: {
            _id: 'file2',
            name: 'File 2',
            size: 3000000,
            completedSize: 1500000,
            remoteUrl: 'https://example.com/file2',
            localPath: '/local/path/file2',
            status: 'progress'
        }
    }
];

const transfers = ref<TransferJob[]>(sampleTransfers);



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
    currentProject,
    selectedProjectId,
    transfers
};


export { store, initUserData, setCurrentProject };
