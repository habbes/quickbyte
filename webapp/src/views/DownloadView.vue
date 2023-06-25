<template>
  <div v-if="!loading">
    <div v-if="error">
      Error: {{ error }}
    </div>
    <div v-if="download">
      <a :href="download.downloadUrl">Download {{ download.originalName }}</a>
    </div>
  </div>
  <div v-else>
    Valiading link...
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useRoute } from "vue-router"
import { apiClient } from "../api";
import type { DownloadRequestResult } from "../api";

const route = useRoute();
route.params.downloadId;
const error = ref<string|undefined>();
const download = ref<DownloadRequestResult|undefined>();
const loading = ref(true);

onMounted(async () => {
  if (!route.params.downloadId || typeof route.params.downloadId !== 'string') {
    error.value = "Invalid download link";
    return;
  }

  try {
    download.value = await apiClient.getDownload(route.params.downloadId);
  }
  catch (e: any) {
    error.value = e.message;
  }
  finally {
    loading.value = false;
  }
  
})
</script>