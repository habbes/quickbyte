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
import { apiClient } from '@/app-utils';
import { humanizeSize, compareLatency, ApiError } from "@/core";
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
  const provider = providers[0];
  const regions = provider.availableRegions;
  console.log('provider', provider, regions);
  // TODO: we should not run the latency test here
  // we should compare latency when app is idle (e.g. after sign up)
  // and cache results
  const pingResults = await compareLatency(regions);
  console.log('ping results', pingResults);
  const preferredRegion = pingResults[0].region;
  const user = await apiClient.getAccount();
  const file = files.value[0];
  const transfer = await apiClient.initTransfer(user.account._id, {
    fileSize: file.size,
    originalName: file.name,
    provider: provider.name,
    region: preferredRegion,
    fileType: file.type,
    md5Hex: "hash"
  });

  await concurrentFileUpload(file, transfer.secureUploadUrl);
  
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

  // naive approach to network resiliency
  // TODO: we probably should not retry for all errors (e.g. it doesn't make sense to retry for an auth error)
  let retry = true;
  while (retry) {
    try {
      await blob.commitBlockList(blockList.map(b => b.id));
      retry = false;
    } catch (e) {
      console.error('error committing blocks', e);
      retry = true;
    }
  }

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
  // TODO: benchmark to decide between different upload strategies
  // await uploadBlockListUsingSequentialBatches(blob, file, blockList, blockSize);
  await uploadBlockListByIndependentWorkers(blob, file, blockList, blockSize);
}

async function uploadBlockListUsingSequentialBatches(blob: BlockBlobClient, file: File, blockList: Block[], blockSize: number) {
  // In this strategy, uploads run in sequential batches
  // Each batch performs n concurrent uploads and we wait to conclude
  // a batch before starting the next one.
  // The downside is that each batch takes as long as the slowest task.
  // Other "workers" in the batch have to wait for the slowest one to complete
  // before the next batch can begin.
  // The upside is the relative simplicity of implementation
  const concurrency = 5;
  let current = 0;
  while (current < blockList.length) {
    const chunk = blockList.slice(current, current + concurrency);
    await Promise.all(chunk.map(block => uploadBlock(blob, file, block, blockSize)));
    current += concurrency;
  }
}

async function uploadBlockListByIndependentWorkers(blob: BlockBlobClient, file: File, blockList: Block[], blockSize: number) {
  // In this strategy, we have n workers
  // Each worker is responsible for uploading every kn + workerIndex block
  // e.g. if n = 5, worker 3 will upload blocks 3, 8, 13, etc.
  // The benefit is that we don't need to maintain a queue or synchronization between workers,
  // there's not contention between workers because there's no overlap
  // The downside is that workers that finish all their work first will
  // remain idle even if there's still work to be done
  const concurrency = 5;
  const workers = new Array(concurrency);
  for (let i = 0; i < concurrency; i++) {
    workers[i] = runUploadWorker(i, concurrency, blob, file, blockList, blockSize);
  }

  await Promise.all(workers);
}

async function runUploadWorker(workerIndex: number, totalWorkers: number, blob: BlockBlobClient, file: File, blockList: Block[], blockSize: number) {
  let nextBlockIndex = workerIndex;
  while (nextBlockIndex < blockList.length) {
    await uploadBlock(blob, file, blockList[nextBlockIndex], blockSize);
    nextBlockIndex += totalWorkers;
  }
}

async function uploadBlock(blob: BlockBlobClient, file: File, block: Block, blockSize: number) {
  const begin = block.index * blockSize;
  const end = begin + blockSize;
  const data = file.slice(block.index * blockSize, end);
  let lastUpdatedProgress = 0;
  // naive approach to ensure uploads are resilient to temporary network failures
  // we just keep retrying indefinitely
  let retry = true;
  while (retry) {
    try {
      await blob.stageBlock(block.id, data, data.size, { onProgress: (progress) => {
        // the event returns the bytes upload so far for this block
        // so we have to deduct the updates we made to the progress in
        // the last event to avoid duplicate updates
        uploadProgress.value += progress.loadedBytes - lastUpdatedProgress;
        lastUpdatedProgress = progress.loadedBytes;
      }});

      retry = false;
    } catch (e) {
      console.log('error staging block', e);
      retry = true;
    }
  }
}

interface Block {
  index: number;
  id: string
}
</script>
