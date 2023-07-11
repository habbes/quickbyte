<template>
  <div class="flex flex-col p-5 sm:items-center sm:mt-20">
    <div class="card max-w-96 sm:w-96 bg-base-100 shadow-xl">
      <!-- loading -->
      <div class="card-body" v-if="loading">
        <p>Validating link...</p>
      </div>

      <!-- file found -->
      <div class="card-body" v-else-if="download">
        <h2 class="card-title">{{ download.originalName  }}</h2>
        <p class="text-gray-400">
          {{  humanizeSize(download.fileSize) }} <br>
          {{  download.fileType }}
        </p>
        <div class="card-actions justify-center mt-4">
          <a class="btn btn-primary w-full" :href="download.downloadUrl">Download</a>
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
import { onMounted, ref } from "vue"
import { useRoute } from "vue-router"
import { apiClient } from "@/app-utils";
import { humanizeSize, ApiError, type DownloadRequestResult } from "@/core";

const route = useRoute();
route.params.downloadId;
const error = ref<Error|undefined>();
const download = ref<DownloadRequestResult|undefined>();
const loading = ref(true);

onMounted(async () => {
  if (!route.params.downloadId || typeof route.params.downloadId !== 'string') {
    error.value = new Error("Invalid download link");
    return;
  }

  try {
    download.value = await apiClient.getDownload(route.params.downloadId);
  }
  catch (e: any) {
    error.value = e;
  }
  finally {
    loading.value = false;
  }
  
})
</script>