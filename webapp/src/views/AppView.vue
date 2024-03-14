<template>
  <AppShell>
    <router-view v-if="dataLoaded"></router-view>
    <div v-else-if="loading" class="mt-10 w-full flex items-center justify-center">
      <span class="loading loading-spinner" />
    </div>
    <div v-else-if="error" class="mt-10 text-center text-error">
      Error: {{ error }}
    </div>
    <InvitesPromptWatcher />
  </AppShell>
</template>
<script lang="ts" setup>
import { store, initUserData, showToast, logger } from "@/app-utils";
import AppShell from '@/components/AppShell.vue';
import InvitesPromptWatcher from '@/components/InvitesPromptWatcher.vue';
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

const loading = ref(false);
const dataLoaded = ref(false);
const error = ref<string>();
const router = useRouter();

onMounted(async () => {
  loading.value = true;
  try {
    await initUserData(router);
    dataLoaded.value = true;
  } catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e, e.message);
    error.value = e.message;
  } finally {
    loading.value = false;
  }
  
  dataLoaded.value = true;
});
</script>