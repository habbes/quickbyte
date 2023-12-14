<template>
  <div v-if="loading" class="w-full">
    
  </div>
  <div v-else class="w-full">
    <div v-if="projects.length === 0" class="flex min-w-full min-h-full justify-center items-center">
      <div class="flex flex-col gap-5 items-center justify-center sm:w-1/2">
        <div class="text-center">
          You have no projects in your account.
          A project allows you to organize your media files
          and collaborate with your partners and clients.
        </div>
        <div>
          <button @click="createProject()" type="button" class="btn btn-lg btn-primary">Create project</button>
        </div>
      </div>
    </div>
    <div v-else>
      <div v-for="project in projects">
        <router-link :to="{ name: 'project-media', params: { projectId: project._id }}">{{ project.name }}</router-link>
      </div>
    </div>
  </div>
  <CreateProjectDialog ref="createProjectDialog" />
</template>
<script lang="ts" setup>
import { apiClient, store, showToast } from '@/app-utils';
import { ensure, type Project } from '@/core';
import { logger } from '@azure/storage-blob';
import { ref, onMounted } from 'vue';
import CreateProjectDialog from '@/components/CreateProjectDialog.vue';

const projects = ref<Project[]>([]);
const loading = ref(false);
const createProjectDialog = ref<typeof CreateProjectDialog>();

onMounted(async () => {
  const user = ensure(store.userAccount.value);
  try {
    loading.value = true;
    projects.value = await apiClient.getProjects(user.account._id);
  } catch (e: any) {
    logger.error(e);
    showToast(e.message, 'error');
  } finally {
    loading.value = false;
  }
});

function createProject() {
  createProjectDialog.value?.open();
}
</script>