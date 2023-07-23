<template>
  <div class="card w-96 bg-base-100 shadow-xl">
    <!-- initial state -->
    <div class="card-body" v-if="uploadState === 'initial' && !file">
      <h2 class="card-title">Transfer a file</h2>
      <Button @click="open()" class="">Select file to upload</Button>
    </div>

    <!-- file selected -->
    <div class="card-body" v-if="uploadState === 'initial' && file">
      <h2 class="card-title">{{ file.name  }}</h2>
      <p class="text-gray-400">
        {{  humanizeSize(file.size) }} <br>
        {{  file.type }}
      </p>
      <div class="card-actions justify-center mt-4">
        <button class="btn btn-primary flex-1" @click="startUpload()">Upload</button>
        <button class="btn" @click="resetState()">Cancel</button>
      </div>
    </div>

    <!-- upload in progress -->
    <div class="card-body" v-if="uploadState === 'progress' && file">
      <h2 class="card-title">{{ file.name }}</h2>
      <div class="flex justify-center">
        <div
          class="radial-progress bg-primary text-primary-content border-4 border-primary" style="--value:70;"
          :style="{ '--value': Math.floor(100 * uploadProgress / file.size )}">
            {{ Math.floor(100 * uploadProgress / file.size )}}%
          </div>
      </div>
      <p class="text-gray-400 text-center">
        {{ humanizeSize(uploadProgress) }} / {{  humanizeSize(file.size) }} <br>
      </p>
    </div>

    <!-- upload complete -->
    <div class="card-body" v-if="uploadState === 'complete' && file">
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
import { apiClient, store, uploadRecoveryManager } from '@/app-utils';
import { humanizeSize, ensure, ApiError, AzUploader } from "@/core";
import Button from "@/components/Button.vue";

type UploadState = 'initial' | 'fileSelection' | 'progress' | 'complete';

const { open, files, reset } = useFileDialog({ multiple: false });
const { copy } = useClipboard();
const file = computed<File|undefined>(() =>
  files.value && files.value.length ?
    files.value[0] : undefined);

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
  if (!files.value?.length) return;

  uploadProgress.value = 0;
  downloadUrl.value = undefined;
  uploadState.value = 'progress';
  const started = new Date();
  const blockSize = 16 * 1024 * 1024; // 16MB

  const user = ensure(store.userAccount.value);
  const provider = ensure(store.preferredProvider.value);
  const file = files.value[0];
  const transfer = await apiClient.initTransfer(user.account._id, {
    fileSize: file.size,
    originalName: file.name,
    provider: provider.provider,
    region: provider.bestRegions[0],
    fileType: file.type,
    md5Hex: "hash"
  });

  const uploadTracker = uploadRecoveryManager.createUploadTracker({
    filename: file.name,
    size: file.size,
    hash: "hash",
    id: transfer._id,
    blockSize: blockSize
  });

  const uploader = new AzUploader({
    file,
    blockSize,
    uploadUrl: transfer.secureUploadUrl,
    tracker: uploadTracker,
    onProgress: (progress) => {
      uploadProgress.value = progress;
    }
  });

  await uploader.uploadFile();
  
  const stopped = new Date();
  console.log('full upload operation took', stopped.getTime() - started.getTime());
  
  let retry = true;
  while (retry) {
    try {
      const download = await apiClient.requestDownload(user.account._id, transfer._id);
      retry = false;
      downloadUrl.value = `${location.origin}/d/${download._id}`;
      uploadState.value = 'complete';
      console.log('full operation + download link took', (new Date()).getTime() - started.getTime());
    } catch (e) {
      if (e instanceof ApiError) {
        // Do not retry on ApiError since it's not a network failure.
        // TODO: handle this error some other way, e.g. alert message
        retry = false;
      } else {
        console.error('Error fetching download', e);
        retry = true;
      }
    }
  }

  await uploadTracker.completeUpload(); // we shouldn't block for this, maybe use promise.then?
}
</script>