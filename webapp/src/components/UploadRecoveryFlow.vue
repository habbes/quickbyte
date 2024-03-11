<template>
  <div class="card sm:w-96 bg-base-100 shadow-xl overflow-y-auto">
    <div class="card-body">
      <h3>Recovered transfers</h3>
      <div class="flex justify-between">
        <button @click="cancel()" class="btn btn-sm">Cancel</button>
        <span @click="deleteAll()" class="text-error underline cursor-pointer">Delete all</span>
      </div>
      <div class="h-72 overflow-auto flex flex-col gap-1">
        <div
          v-for="transfer in recoveredUploads"
          :key="transfer.id"
          class="bg-base-200 p-5 rounded-md flex flex-col gap-2"
        >
          <div>{{ transfer.name }}</div>
          <div class="text-gray-400 text-sm">{{ humanizeSize(transfer.totalSize) }}</div>
          <div class="flex flex-row justify-end gap-2">
            <button class="btn btn-primary btn-sm" @click="recoverUpload(transfer.id)">Resume</button>
            <button @click="deleteUpload(transfer.id)" class="btn btn-error btn-sm">Delete</button>
          </div>
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

const recoveredUploads = store.recoveredTransfers;

function cancel() {
  emit('done');
}

async function deleteAll() {
  await uploadRecoveryManager.clearRecoveredTransfers();
  emit('done');
}

async function deleteUpload(id: string) {
  await uploadRecoveryManager.deleteRecoveredTransfer(id);
  if (!recoveredUploads.value.length) {
    emit('done');
  }
}

function recoverUpload(id: string) {
  emit('selectUpload', id);
}
</script>