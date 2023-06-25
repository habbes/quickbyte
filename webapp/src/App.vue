<script setup lang="ts">
import { signIn, useUser, signOut } from './auth.js'
import { apiClient } from './api.js';
import { useFileDialog } from '@vueuse/core';
import { BlockBlobClient } from "@azure/storage-blob";
import { ref } from "vue";

const user = useUser();
const { open, files } = useFileDialog({ multiple: false });
const uploadProgress = ref<number>(0);
const uploadState = ref<'stopped'|'progress'>('stopped');
const downloadUrl = ref<string|undefined>();

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
  console.log('full operation took', stopped.getTime() - started.getTime());
  uploadState.value = 'stopped';

  const download = await apiClient.requestDownload(user.account._id, transfer._id);
  downloadUrl.value = download.downloadUrl;
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
  const res = await blob.stageBlock(block.id, data, data.size);
  uploadProgress.value += data.size;
}

interface Block {
  index: number;
  id: string
}
</script>

<template>
  <div v-if="user">
    Hello {{ user.name  }}
    <button @click="signOut()">Sign Out</button>
    <div>
      <button @click="open()">Select file</button>
      <div v-for="file in files" :key="file.name">
        <div>Filename: {{ file.name  }}</div>
        <div>Size: {{ file.size/ (1024 * 1024 * 1024) }} GB</div>
        <div><button @click="startUpload()">Upload</button></div>
        <div v-if="uploadState === 'progress'">
          Uploading...
          <progress :value="uploadProgress" :max="file.size"></progress>
        </div>
        <div v-if="downloadUrl">
          Download url: <a :href="downloadUrl">{{ downloadUrl }}</a>
        </div>
      </div>
    </div>
  </div>
  <div v-else>
    <button @click="signIn">Sign In</button>
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
