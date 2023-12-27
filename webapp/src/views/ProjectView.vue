<template>
  <div v-if="project" class="flex flex-col flex-1 w-full">
    <div class="flex flex-row items-center justify-between px-5 border-b border-[#2e2634]" :style="{ height: `${headerHeight}px` }">
      <div class="text-white text-lg flex items-center">{{ project.name }}</div>
      <div class="shadow-sm h-full">
        <router-link
          :to="{ name: 'project-media', params: { projectId: project._id }}"
          class="hover:text-white inline-flex h-full items-center px-4"
          exactActiveClass="text-white border-b-2 border-b-blue-300"
        >
          Media
        </router-link>
        <router-link
          :to="{ name: 'project-members', params: { projectId: project._id }}"
          class="hover:text-white inline-flex h-full items-center px-4"
          activeClass="text-white border-b-2 border-b-blue-300"
        >
          Members
        </router-link>
        <router-link
          :to="{ name: 'project-media', params: { projectId: project._id }}"
          class="hover:text-white py-3 px-4 inline-block"
        >
          Tasks
        </router-link>
        <router-link
          :to="{ name: 'project-media', params: { projectId: project._id }}"
          class="hover:text-white py-3 px-4 inline-block"
        >
          Timeline
        </router-link>
      </div>
    </div>
    <div class="flex-grow overflow-y-auto p-5" :style="{ height: contentHeight }">
      <router-view></router-view>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { apiClient, showToast, store } from '@/app-utils';
import { ensure, type Project } from '@/core';
import { logger } from '@azure/storage-blob';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { layoutDimensions } from '@/styles/dimentions.js';

const route = useRoute();
const project = ref<Project>();
const loading = ref(false);
const headerHeight = 50;
const contentHeight = `calc(100vh - ${layoutDimensions.navBarHeight + headerHeight }px)`;

onMounted(async () => {
  const user = ensure(store.userAccount.value);
  const id = ensure(route.params.projectId) as string;
  loading.value = true;

  try {
    // TODO: should be able to fetch project without using account id
    // The project might belong to a different account than the current user
    // Or the current user could be a guest without an account
    project.value = await apiClient.getProject(user.account._id, id);
  } catch (e: any) {
    logger.error(e);
    showToast(e.message, 'error');
  } finally {
    loading.value = false;
  }
});
</script>