<template>
  <div class="flex flex-col gap-2 p-5 sm:justify-center sm:items-center sm:mt-20">
    <div class="alert alert-info w-96" v-if="recoveredUploads.length && state === 'newUpload' " @click="showRecoveryFlow">
      We've detected incomplete transfers from a previous session.
      Click here to see the files.
    </div>
    <UploadCard v-if="state === 'newUpload'" />
    <UploadRecoveryFlow v-if="state === 'recoveryFlow'" @select-upload="recoverUpload"/>
    <RecoveryUploadCard
      v-if="state === 'recoveryUpload' && selectedRecoveredUploadId"
      :uploadId="selectedRecoveredUploadId"
      @complete="completeRecoveredUpload"
    />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { store } from '@/app-utils';
import UploadCard from '@/components/UploadCard.vue';
import UploadRecoveryFlow from '@/components/UploadRecoveryFlow.vue';
import RecoveryUploadCard from '@/components/RecoveryUploadCard.vue';

type State = 'newUpload' | 'recoveryFlow' | 'recoveryUpload';

const state = ref<State>('newUpload');
const selectedRecoveredUploadId = ref<string>();

const recoveredUploads = store.recoveredUploads;

// TODO:
// - remove recovery notice when upload is in progress
// - allow cancelling recovery flow

function showRecoveryFlow() {
  state.value = 'recoveryFlow';
}

function recoverUpload(id: string) {
  selectedRecoveredUploadId.value = id;
  state.value = 'recoveryUpload';
}

function completeRecoveredUpload() {
  state.value = 'newUpload';
}
</script>
