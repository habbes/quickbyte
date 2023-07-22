<template>
  <div class="card w-96 bg-base-100 shadow-xl overflow-y-auto">
    <div class="card-body">
      <h3>Recovered transfers</h3>
      <div class="flex justify-between">
        <button @click="cancel()" class="btn btn-sm">Cancel</button>
        <span @click="deleteAll()" class="text-error underline cursor-pointer">Delete all</span>
      </div>
      <div
        v-for="upload in recoveredUploads"
        :key="upload.id"
        class="bg-base-200 p-5 rounded-md flex flex-col gap-2"
      >
        <div>{{ upload.filename }}</div>
        <div class="text-gray-400 text-sm">{{ humanizeSize(upload.size) }}</div>
        <div class="flex flex-row justify-end gap-2">
          <button class="btn btn-primary btn-sm" @click="recoverUpload(upload.id)">Resume</button>
          <button @click="deleteUpload(upload.id)" class="btn btn-error btn-sm">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { humanizeSize } from '@/core';
import { store, uploadRecoveryManager } from '@/app-utils';

const emit = defineEmits<{
  (event: 'selectUpload', uploadId: string): void;
  (event: 'done'): void;
}>();

const recoveredUploads = store.recoveredUploads;

function cancel() {
  emit('done');
}

async function deleteAll() {
  await uploadRecoveryManager.clearRecoveredUploads();
  emit('done');
}

async function deleteUpload(id: string) {
  await uploadRecoveryManager.deleteRecoveredUpload(id);
  if (!recoveredUploads.value.length) {
    emit('done');
  }
}

function recoverUpload(id: string) {
  emit('selectUpload', id);
}
</script>