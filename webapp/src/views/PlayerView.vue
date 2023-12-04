<template>
  <div class="flex flex-col p-5 gap-2 justify-center sm:items-center sm:mt-20">
    <div v-if="download && error"
      class="alert alert-error w-96 cursor-pointer"
      @click="error = undefined"
    >
      <span class="text-xs">{{ error.message }}</span>
    </div>
    <div class="card-body" v-if="loading">
      <p>Validating link...</p>
    </div>
    <div v-else-if="file">
      <video :src="file.downloadUrl" controls></video>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRoute } from "vue-router"
import { apiClient, downloaderProvider, logger, windowUnloadManager, getDeviceData, store } from "@/app-utils";
import { humanizeSize, ApiError, type DownloadRequestResult, ensure, isOperationCancelledError, isNetworkError, retryOnError } from "@/core";
import { ArrowDownTrayIcon } from "@heroicons/vue/24/solid";
import FileListItem from '@/components/FileListItem.vue';

type DownloadState = 'pending' | 'complete' | 'inProgress';

// When transfers are larger than this size,
// a warning will be displayed on browers which
// don't support optimial download experience
const MIN_SIZE_FOR_DOWNLOAD_WARNING = 1 * 1024 * 1024 * 2014; // 1GB
const route = useRoute();
route.params.downloadId;
const error = ref<Error|undefined>();
const download = ref<DownloadRequestResult|undefined>();
const totalSize = computed(() => download.value && download.value.files.reduce((a, b) => a + b.size, 0));
const downloadProgress = ref(0);
const loading = ref(true);
const zipDownloadState = ref<DownloadState>('pending');
const zipFileName = ref<string>();
const optimalDownloaderSupported = downloaderProvider.isOptimalDownloaderSupported();
const deviceData = store.deviceData;
// keeps track of files that have been individually downloaded
const requestFiles = ref<string[]>([]);
const files = computed(() => download.value?.files || []);
const file = computed(() => files.value.length ? files.value[0] : undefined);

onMounted(async () => {
  if (!route.params.downloadId || typeof route.params.downloadId !== 'string') {
    error.value = new Error("Invalid download link");
    return;
  }

  await getDeviceData();

  try {
    download.value = await apiClient.getDownload(route.params.downloadId, deviceData.value || {});
    download.value.files
    zipFileName.value = `${download.value.name}.zip`;
  }
  catch (e: any) {
    error.value = e;
  }
  finally {
    loading.value = false;
  }
});





</script>