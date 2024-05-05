<template>
  <UiLayout @click="startDownload()" v-if="status === 'pending'" horizontal itemsCenter gapSm class="cursor-pointer hover:text-white">
    <span>Download all</span>
    <ArrowDownTrayIcon class="h-4 w-4"/>
  </UiLayout>
  <UiLayout v-else>
    <UiBottomSheetPopoverMenu right>
      <template #trigger>
        <UiLayout>
          <UiLayout v-if="status === 'preparing'">
            Preparing files...
          </UiLayout>
          <UiLayout v-else-if="status === 'downloading'">
            <div>
              Downloading {{ Math.floor(downloadProgress) }}%
            </div>
          </UiLayout>
          <UiLayout v-else-if="status === 'done'">
            <div>
              Download complete
            </div>
          </UiLayout>
          <UiLayout v-else-if="status === 'error'">
            <div>
              An error occured
            </div>
          </UiLayout>
        </UiLayout>
      </template>
      <UiLayout innerSpace>
        <UiLayout v-if="status === 'downloading'" gapSm>
          <UiLayout horizontal itemsCenter justifyCenter>
            <div class="text-gray-700 text-center font-bold">
              {{ zipFileName }}
            </div>
          </UiLayout>
          <UiLayout horizontal itemsCenter justifyCenter>
            <UiRadialProgress :progressPercentage="downloadProgress" />
          </UiLayout>
          <UiLayout itemsCenter>
            <div class="text-gray-400">
              {{ files.length }} files
            </div>
            <div class="text-gray-400">
              {{ humanizeSize(downloadedSize) }} / {{  humanizeSize(totalSize || 0) }}
            </div>
          </UiLayout>
          <UiLayout>
            <div class="text-xs text-center">
              Closing or reloading the browser page will cancel the download.
            </div>
          </UiLayout>
          <UiLayout v-if="!optimalDownloaderSupported && totalSize >= MIN_SIZE_FOR_DOWNLOAD_WARNING">
            <div class="text-xs text-center">
              This browser does not support an optimal download experience.
              Consider using Microsoft Edge or Google Chrome
              if you're downloading large files.
            </div>
          </UiLayout>
        </UiLayout>
        <UiLayout v-if="status === 'done'" :gap="4">
          <UiLayout horizontal itemsCenter justifyCenter>
            <div class="text-gray-700 font-bold">
              Download complete!
            </div>
          </UiLayout>
          <UiLayout itemsCenter>
            <div class="text-xs text-center">
              <span>Look for </span>
              <span class="font-bold text-gray-700">{{ zipFileName }}</span>
              <span> on your device.</span>
            </div>
          </UiLayout>
          <UiLayout v-if="totalSize >= MIN_SIZE_FOR_ZIP64_TIP" itemsCenter>
            <div class="text-xs text-center">
              Support for ZIP files larger than 4GB may be limited on some platforms.
              Consider using a tool like <a class="font-bold link" href="https://www.7-zip.org/" target="_blank">7Zip</a> if you run into issues.
            </div>
          </UiLayout>
          <UiLayout itemsCenter>
            <UiButton primary @click="status = 'pending'">Done</UiButton>
          </UiLayout>
        </UiLayout>
        <UiLayout v-if="status === 'error'" :gap="4">
          <UiLayout>
            <div class="text-xs text-center text-error">
              {{ error?.message }}
            </div>
          </UiLayout>
          <UiLayout itemsCenter>
            <UiButton primary @click="status = 'pending'">Done</UiButton>
          </UiLayout>
        </UiLayout>
      </UiLayout>
    </UiBottomSheetPopoverMenu>
  </UiLayout>
    
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";
import { UiLayout, UiBottomSheetPopoverMenu, UiRadialProgress, UiButton } from "@/components/ui";
import { ArrowDownTrayIcon } from "@heroicons/vue/24/outline";
import { downloaderProvider, logger, projectShareStore, showToast, trpcClient, windowUnloadManager, wrapError } from "@/app-utils";
import { ensure, isNetworkError, isOperationCancelledError, humanizeSize, MIN_SIZE_FOR_ZIP64_TIP, MIN_SIZE_FOR_DOWNLOAD_WARNING } from "@/core";
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
const downloadedSize = computed(() => {
  const downloaded = downloadProgress.value * totalSize.value / 100;
  return Math.min(downloaded, totalSize.value);
});

const optimalDownloaderSupported = downloaderProvider.isOptimalDownloaderSupported();

function startDownload() {
  return wrapError(async () => {
    if (!share.value || !code.value) {
      return;
    }

    status.value = 'preparing';
    try {
      const result = await trpcClient.getAllProjectShareFilesForDownload.query({
        shareId: ensure(share.value)._id,
        shareCode: ensure(code.value),
        password: password.value
      });

      files.value = result.files;
      await downloadZip(files.value);
    } catch (e: any) {
      showToast(e.message, 'error');
      logger.error(e.message, e);
      error.value = e;
      status.value = 'error';
    }
  });
}


async function downloadZip(files: ZipDownloadRequestFile[]) {
  if (!share.value) return;
  if (totalSize.value >= MIN_SIZE_FOR_DOWNLOAD_WARNING && !optimalDownloaderSupported) {
    showToast('You may experiences suboptimal download experience on this browser.', 'warning');
  }
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
      showToast(`Downloade complete. The file '${zipFileName.value}' has been saved to your device.`, 'info');
  }
  catch (e: any) {
    
   
    if (isOperationCancelledError(e)) {
      status.value = 'pending';
      return;
    }

    logger.error(e.message, e);
    if (isNetworkError(e)) {
      error.value = new Error('Network error occurred');
    } else {
      error.value = e as Error;
    }

    status.value = 'error';
    showToast(error.value.message, 'error');
  }
  finally {
    removeOnExitWarning();
    downloadProgress.value = 0;

    // attempt to update server
    // TODO updata server on updload engagement
  }
};


</script>