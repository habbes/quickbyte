<template>
  <div class="flex flex-col p-5 gap-2 sm:items-center sm:mt-20">
    <div v-if="!optimalDownloaderSupported"
      class="alert alert-warning w-96">
      <span class="text-xs">
        This browser does not support an optimal download experience.
        Consider using Microsoft Edge or Google Chrome
        if you're downloading large files.
      </span>
    </div>
    <div v-if="download && zipDownloadState === 'complete'"
      class="alert alert-success w-96 cursor-pointer"
      @click="zipDownloadState = 'pending'">
      <span class="text-xs">Download complete. Look for <b>{{ zipFileName }}</b> on your device.</span>
    </div>
    <div v-else-if="download && zipDownloadState === 'inProgress'"
      class="alert alert-info w-96"
      @click="zipDownloadState = 'pending'">
      <span class="text-xs">
        Downloading <b>{{ zipFileName || 'the zip file' }}</b> ({{ humanizeSize(totalSize || 0) }}).
        Do not close or reload the browser tab.
      </span>
    </div>
    <div class="card max-w-96 sm:w-96 bg-base-100 shadow-xl">
      <!-- loading -->
      <div class="card-body" v-if="loading">
        <p>Validating link...</p>
      </div>

      <!-- file found -->
      <div class="card-body" v-else-if="download">
        <h2 class="card-title">{{ download.name  }}</h2>
        <div v-if="zipDownloadState !== 'inProgress'" class="flex justify-between items-center mb-2">
          <div class="text-gray-400">
            {{ download.files.length }} files - {{  humanizeSize(totalSize || 0) }} <br>
          </div>
          <div>
            <button class="btn btn-primary btn-sm w-full" @click="downloadZip()">
              Download all
            </button>
          </div>
        </div>
        <div v-else-if="zipDownloadState === 'inProgress'" class="flex justify-between items-center mb-2">
          <div class="text-gray-400">
            {{ download.files.length }} files - {{  humanizeSize(totalSize || 0) }} <br>
          </div>
        </div>
        <div v-if="zipDownloadState === 'inProgress'" class="flex flex-col gap-2">
          <div class="flex justify-center">
            <div
              class="radial-progress bg-primary text-primary-content border-4 border-primary"
              :style="{ '--value': Math.floor(downloadProgress) }">
                {{ Math.floor(downloadProgress)}}%
            </div>
          </div>
        </div>
        
        <div class="h-60 overflow-auto">
          <div v-for="file in download.files" :key="file._id" class="border-b border-b-gray-100 py-1">
            <div class="flex justify-between items-center">
              <div>
                <div class="text-sm flex justify-between">
                  {{ file.name }}
                </div>
                <div class="text-sm text-gray-400 flex gap-2">
                  <DocumentIcon class="h-5 w-5"/>
                  {{ file.name.split('.').at(-1) }} - {{ humanizeSize(file.size) }}
                </div>
              </div>
              <div>
                <a title="Download file" :href="file.downloadUrl" :download="file.name.split('/').at(-1)">
                  <ArrowDownTrayIcon
                    class="h-6 w-6 cursor-pointer"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- error -->
      <div class="card-body" v-else-if="error">
        <p v-if="(error instanceof ApiError) && error.statusCode === 404" class="text-error">
          The file does not exist or the link has expired. Make sure you're using
          the correct link.
        </p>
        <p v-else class="text-error">
          {{ error.message }}
        </p>
      </div>
    </div>
    <div class="mt-5 sm:w-96">
      <!-- TODO: we should link back to the upload/home page-->
      <!-- <router-link class="btn w-full" :to="{ name: 'home' }">Have a file to send?</router-link> -->
      <!-- TODO: during the preview we'll link to the landing page -->
      <a class="btn w-full" href="https://quickbyte.io" target="_blank">Have a file to send?</a>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute } from "vue-router"
import { apiClient, downloaderProvider, showToast, windowUnloadManager } from "@/app-utils";
import { humanizeSize, ApiError, type DownloadRequestResult, ensure, isOperationCancelledError } from "@/core";
import { ArrowDownTrayIcon } from "@heroicons/vue/24/solid";
import { FolderIcon, DocumentIcon, PlusCircleIcon } from "@heroicons/vue/24/outline";

type DownloadState = 'pending' | 'complete' | 'inProgress';

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

onMounted(async () => {
  if (!route.params.downloadId || typeof route.params.downloadId !== 'string') {
    error.value = new Error("Invalid download link");
    return;
  }

  try {
    download.value = await apiClient.getDownload(route.params.downloadId);
    zipFileName.value = `${download.value.name}.zip`;
  }
  catch (e: any) {
    error.value = e;
  }
  finally {
    loading.value = false;
  }
});

async function downloadZip() {
  const transfer = ensure(download.value);
  const downloader = downloaderProvider.getDownloader();
  const removeOnExitWarning = windowUnloadManager.warnUserOnExit();
  try {
    await downloader.download(
      transfer,
      ensure(zipFileName.value),
      (progress) => {
        downloadProgress.value = progress;
      },
      (userSelectedFileName) => {
        zipFileName.value = userSelectedFileName;
        zipDownloadState.value = 'inProgress';
      });
  
    zipDownloadState.value = 'complete';
  }
  catch (e: any) {
    zipDownloadState.value = 'pending';
    if (isOperationCancelledError(e)) {
      return;
    }

    showToast(e.message, 'error');
  }
  finally {
    removeOnExitWarning();
    downloadProgress.value = 0;
  }
};
</script>