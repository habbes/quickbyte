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
      </div>
    </div>
    <div class="flex-grow overflow-y-auto p-5" :style="{ height: contentHeight }">
      <router-view></router-view>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { showToast, store, logger } from '@/app-utils';
import { ensure } from '@/core';
import type { WithRole, Project } from '@quickbyte/common';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { layoutDimensions } from '@/styles/dimentions.js';

const route = useRoute();
const project = ref<WithRole<Project>>();
const loading = ref(false);
const headerHeight = 50;
const contentHeight = `calc(100vh - ${layoutDimensions.navBarHeight + headerHeight }px)`;

onMounted(async () => {
  logger.log('project view mounted');
  const account = ensure(store.currentAccount.value);
  const id = ensure(route.params.projectId) as string;
  loading.value = true;

  // we expect the project to be in the store since
  // the site fetches all user projects at load time.
  // So the project should exist in the store (if it exists for this user) even if this page
  // is visted directly by the user.
  project.value = store.projects.value.find(p => p._id === id);
  loading.value = false;
  if (!project.value) {
    showToast('The project does not exist or you do not have access.', 'error');
    return;
  }
  
  // automatically set the current account to the project's account
  // if they differ
  if (project.value.accountId !== account._id) {
    store.setCurrentAccount(project.value.accountId);
  }
});
</script>