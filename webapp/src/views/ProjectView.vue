<template>
  <div v-if="project" class="flex flex-col w-full">
    <div class="text-white text-lg mb-5">{{ project.name }}</div>
    <div class="mb-5 border-b border-[#2e2634] w-full shadow-sm">
      <router-link
        :to="{ name: 'project-media', params: { projectId: project._id }}"
        class="hover:text-white py-3 px-4 inline-block"
        activeClass="text-white border-b border-b-white"
      >
        Media
      </router-link>
    </div>
    <div>
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

const route = useRoute();
const project = ref<Project>();
const loading = ref(false);

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