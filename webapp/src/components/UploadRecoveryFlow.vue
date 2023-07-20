<template>
  <div class="card w-96 bg-base-100 shadow-xl overflow-y-auto">
    <div class="card-body">
      <h3>Recovered transfers</h3>
      <div
        v-for="upload in recoveredUploads"
        :key="upload.id"
        class="bg-base-200 p-5 rounded-md flex flex-col gap-2"
      >
        <div>{{ upload.filename }}</div>
        <div class="text-gray-400 text-sm">{{ humanizeSize(upload.size) }}</div>
        <div class="flex flex-row justify-end gap-2">
          <router-link class="btn btn-primary btn-sm" :to="{ name: 'recoverUpload', params: { uploadId: upload.id }}">Resume</router-link>
          <button class="btn btn-error btn-sm">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { humanizeSize } from '@/core';
import { store, uploadRecoveryManager } from '@/app-utils';

const recoveredUploads = store.recoveredUploads;
</script>