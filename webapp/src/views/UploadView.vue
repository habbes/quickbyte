<template>
  <div class="flex p-5 sm:justify-center sm:items-center sm:mt-20">
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
          <button class="btn btn-primary w-full" @click="startUpload()">Upload</button>
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
  </div>
</template>
<script setup lang="ts">
import { useFileDialog, useClipboard } from '@vueuse/core';
import { BlockBlobClient } from "@azure/storage-blob";
import { ref, computed } from "vue";
import { apiClient } from '@/api.js';
import { humanizeSize } from "@/util.js";
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

  const providers = await apiClient.getProviders();
  const user = await apiClient.getAccount();
  const file = files.value[0];
  const transfer = await apiClient.initTransfer(user.account._id, {
    fileSize: file.size,
    originalName: file.name,
    provider: providers[0].name,
    region: providers[0].availableRegions[0],
    fileType: file.type,
    md5Hex: "hash"
  });

  await concurrentFileUpload(file, transfer.secureUploadUrl);
  
  const stopped = new Date();
  console.log('full upload operation took', stopped.getTime() - started.getTime());
  

  const download = await apiClient.requestDownload(user.account._id, transfer._id);
  downloadUrl.value = `${location.origin}/d/${download._id}`;
  uploadState.value = 'complete';
  console.log('full operation + download link took', stopped.getTime() - started.getTime());
}

async function concurrentFileUpload(file: File, uploadUrl: string) {
  const blob = new BlockBlobClient(uploadUrl);
  const blockSize = 16 * 1024 * 1024; // 16MB
  const numBlocks = Math.ceil(file.size / blockSize);
  const blockList = [];
  for (let i = 0; i < numBlocks; i++){
    blockList.push({
      index: i,
      id: btoa(generateId(8))
    });
  }

  const started = new Date();
  await uploadBlockList(blob, file, blockList, blockSize);
  await blob.commitBlockList(blockList.map(b => b.id));
  const stopped = new Date();
  console.log("Completed block list upload", stopped.getTime() - started.getTime());
}

function generateId(length: number) {
  const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = ' ';
  const charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

async function uploadBlockList(blob: BlockBlobClient, file: File, blockList: Block[], blockSize: number) {
  const concurrency = 5;
  let current = 0;
  while (current < blockList.length) {
    const chunk = blockList.slice(current, current + concurrency);
    await Promise.all(chunk.map(block => uploadBlock(blob, file, block, blockSize)));
    current += concurrency;
  }
}

async function uploadBlock(blob: BlockBlobClient, file: File, block: Block, blockSize: number) {
  const begin = block.index * blockSize;
  const end = begin + blockSize;
  const data = file.slice(block.index * blockSize, end);
  let lastUpdatedProgress = 0;
  await blob.stageBlock(block.id, data, data.size, { onProgress: (progress) => {
    // the event returns the bytes upload so far for this block
    // so we have to deduct the updates we made to the progress in
    // the last event to avoid duplicate updates
    uploadProgress.value += progress.loadedBytes - lastUpdatedProgress;
    lastUpdatedProgress = progress.loadedBytes;
  }});
}

interface Block {
  index: number;
  id: string
}
</script>
