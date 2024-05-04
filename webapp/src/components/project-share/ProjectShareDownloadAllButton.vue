<template>
  <UiLayout @click="startDownload()" v-if="status === 'pending'" horizontal itemsCenter gapSm class="cursor-pointer hover:text-white">
    <span>Download all</span>
    <ArrowDownTrayIcon class="h-4 w-4"/>
  </UiLayout>
  <UiLayout v-else-if="status === 'preparing'">
    Preparing files for download...
  </UiLayout>
  <UiLayout v-else-if="status === 'downloading'">
    <div>
      Download in progess. Please don't close or reload the browser tab.
    </div>
    <div>
      {{ downloadProgress }}
    </div>
  </UiLayout>
  <UiLayout v-else-if="status === 'done'" @click="status = 'pending'">
    <div>
      Download complete. Look for {{ zipFileName }} on your device.
    </div>
  </UiLayout>
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";
import { UiLayout } from "@/components/ui";
import { ArrowDownTrayIcon } from "@heroicons/vue/24/outline";
import { downloaderProvider, projectShareStore, trpcClient, windowUnloadManager, wrapError } from "@/app-utils";
import { ensure, isNetworkError, isOperationCancelledError } from "@/core";
import type { ZipDownloadRequestFile } from "@/core";

type Status = 'pending'|'preparing'|'downloading'|'done'|'error';

const share = projectShareStore.share;
const code = projectShareStore.code;
const password = projectShareStore.password;
const status = ref<Status>('pending');
const error = ref<Error|undefined>();
const zipFileName = ref('');
const downloadProgress = ref(0);
const files = ref<ZipDownloadRequestFile[]>([]);
const totalSize = computed(() => files.value.reduce((sizeSoFar, file) => file.size + sizeSoFar, 0));

function startDownload() {
  return wrapError(async () => {
    if (!share.value || !code.value) {
      return;
    }

    status.value = 'preparing';
    const result = await trpcClient.getAllProjectShareFilesForDownload.query({
      shareId: ensure(share.value)._id,
      shareCode: ensure(code.value),
      password: password.value
    });

    files.value = result.files;
    
    await downloadZip(files.value);
  });
}


async function downloadZip(files: ZipDownloadRequestFile[]) {
  if (!share.value) return;
  const downloader = downloaderProvider.getDownloader();
  const removeOnExitWarning = windowUnloadManager.warnUserOnExit();
  zipFileName.value = `${share.value!.name}.zip`;
  try {
    await downloader.download(
      {
        name: share.value.name,
        files: files
      },
      zipFileName.value,
      (progress) => {
        downloadProgress.value = progress;
      },
      (userSelectedFileName) => {
        zipFileName.value = userSelectedFileName;
        status.value = 'downloading';
      });
  
      status.value = 'done';
  }
  catch (e: any) {
    status.value = 'pending';
    if (isOperationCancelledError(e)) {
      return;
    }

    if (isNetworkError(e)) {
      error.value = new Error('Network error occurred');
    } else {
      error.value = e as Error;
    }
  }
  finally {
    removeOnExitWarning();
    downloadProgress.value = 0;

    // attempt to update server
    // TODO updata server on updload engagement
  }
};


</script>