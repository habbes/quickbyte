<template>
  <div class="card w-96 bg-base-100 shadow-xl">
    <!-- initial state -->
    <div class="card-body" v-if="uploadState === 'initial' && !transferDetails">
      <h2 class="card-title">Transfer a file</h2>
      <Button @click="open()" class="">Select file to upload</Button>
    </div>

    <!-- file selected -->
    <div class="card-body" v-if="uploadState === 'initial' && transferDetails">
      <h2 class="card-title">{{ transferDetails.name  }}</h2>
      <div>
        <div v-for="file in files" :key="file.name">
          {{ file.name }}
        </div>
      </div>
      <p class="text-gray-400">
        {{  humanizeSize(transferDetails.totalSize) }} <br>
      </p>
      <div class="card-actions justify-center mt-4">
        <button class="btn btn-primary flex-1" @click="startUpload()">Upload</button>
        <button class="btn" @click="resetState()">Cancel</button>
      </div>
    </div>

    <!-- upload in progress -->
    <div class="card-body" v-if="uploadState === 'progress' && transferDetails">
      <h2 class="card-title">{{ transferDetails.name }}</h2>
      <div class="flex justify-center">
        <div
          class="radial-progress bg-primary text-primary-content border-4 border-primary" style="--value:70;"
          :style="{ '--value': Math.floor(100 * uploadProgress / transferDetails.totalSize )}">
            {{ Math.floor(100 * uploadProgress / transferDetails.totalSize )}}%
          </div>
      </div>
      <p class="text-gray-400 text-center">
        {{ humanizeSize(uploadProgress) }} / {{  humanizeSize(transferDetails.totalSize) }} <br>
      </p>
    </div>

    <!-- upload complete -->
    <div class="card-body" v-if="uploadState === 'complete' && transferDetails">
      <h2 class="card-title">Upload complete!</h2>
      <p>Copy and share the <a class="link" :href="downloadUrl" target="_blank">download link</a> with the recipients:</p>
      <div class="relative mb-6" @click="copyDownloadUrl()">
        <div class="absolute left-0 right-0 overflow-auto border p-2 rounded-md">
          {{ downloadUrl }}
        </div>
      </div>
      <div class="card-actions justify-center mt-4">
        <button v-if="!copiedDownloadUrl" class="btn btn-primary w-full" @click="copyDownloadUrl()">Copy link</button>
        <button v-if="copiedDownloadUrl" class="btn btn-primary w-full" @click="resetState()">Send another file</button>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useFileDialog, useClipboard } from '@vueuse/core';
import { ref, computed } from "vue";
import { apiClient, store, uploadRecoveryManager, logger } from '@/app-utils';
import { humanizeSize, ensure, ApiError, AzUploader, MultiFileUploader } from "@/core";
import Button from "@/components/Button.vue";

type UploadState = 'initial' | 'fileSelection' | 'progress' | 'complete';

const { open, files, reset } = useFileDialog({ multiple: true });
const { copy } = useClipboard();
// const file = computed<File|undefined>(() =>
//   files.value && files.value.length ?
//     files.value[0] : undefined);
const transferDetails = computed(() =>
  files.value && files.value.length && {
    name: files.value[0].name,
    totalSize: Array.from(files.value).map(f => f.size).reduce((a, b) => a + b)
  });

const uploadProgress = ref<number>(0);
const uploadState = ref<UploadState>('initial');
const downloadUrl = ref<string|undefined>();
const copiedDownloadUrl = ref<boolean>(false);

function resetState() {
  reset();
  downloadUrl.value = undefined;
  uploadState.value = 'initial';
  uploadProgress.value = 0;
  copiedDownloadUrl.value = false;
}

function copyDownloadUrl() {
  if (!downloadUrl.value) return;

  copy(downloadUrl.value);
  copiedDownloadUrl.value = true;
}

async function startUpload() {
  if (!files.value) return;
  if (!files.value?.length) return;

  uploadProgress.value = 0;
  downloadUrl.value = undefined;
  uploadState.value = 'progress';
  const started = new Date();
  const blockSize = 16 * 1024 * 1024; // 16MB

  const user = ensure(store.userAccount.value);
  const provider = ensure(store.preferredProvider.value);
  const file = files.value[0];
  const transfer = await apiClient.createTransfer(user.account._id, {
    name: file.name,
    provider: provider.provider,
    region: provider.bestRegions[0],
    files: Array.from(files.value).map(f => ({ name: f.name, size: f.size }))
  });

  // need to rethink the tracker for multi-file
  const uploadTracker = uploadRecoveryManager.createUploadTracker({
    filename: file.name,
    size: file.size,
    hash: "hash",
    id: transfer._id,
    blockSize: blockSize
  });

  // const uploader = new AzUploader({
  //   file,
  //   blockSize,
  //   uploadUrl: transfer.files[0].uploadUrl,
  //   tracker: uploadTracker,
  //   onProgress: (progress) => {
  //     uploadProgress.value = progress;
  //   },
  //   logger
  // });

  const uploader = new MultiFileUploader({
    files: transfer.files,
    onProgress: (progress) => {
      uploadProgress.value = progress
    },
    uploaderFactory: (file, onFileProgress, fileIndex) => {
      if (!files.value) throw new Error("Excepted files.value to be set");
      return new AzUploader({
        file: files.value[fileIndex],
        blockSize,
        uploadUrl: file.uploadUrl,
        tracker: uploadTracker,
        onProgress: onFileProgress,
        logger
      })
    }
  });

  // await uploader.uploadFile();
  await uploader.uploadFiles();
  
  const stopped = new Date();
  logger.log(`full upload operation took ${stopped.getTime() - started.getTime()}`);
  
  let retry = true;
  while (retry) {
    try {
      const download = await apiClient.finalizeTransfer(user.account._id, transfer._id);
      retry = false;
      downloadUrl.value = `${location.origin}/d/${download._id}`;
      uploadState.value = 'complete';
      logger.log(`full operation + download link took ${(new Date()).getTime() - started.getTime()}`);
    } catch (e) {
      if (e instanceof ApiError) {
        // Do not retry on ApiError since it's not a network failure.
        // TODO: handle this error some other way, e.g. alert message
        retry = false;
      } else {
        logger.error('Error fetching download', e);
        retry = true;
      }
    }
  }

  await uploadTracker.completeUpload(); // we shouldn't block for this, maybe use promise.then?
}
</script>