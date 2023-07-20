<template>
  <div class="flex flex-col gap-2 p-5 sm:justify-center sm:items-center sm:mt-20">
    <div class="alert alert-info w-96" v-if="recoveredUploads.length && !isShowingRecoveryFlow" @click="showRecoveryFlow">
      We've detected incomplete transfers from a previous session.
      Click here to see the files.
    </div>
    <UploadCard v-if="!isShowingRecoveryFlow" />
    <UploadRecoveryFlow v-if="isShowingRecoveryFlow" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { store } from '@/app-utils';
import UploadCard from '@/components/UploadCard.vue';
import UploadRecoveryFlow from '@/components/UploadRecoveryFlow.vue';

const isShowingRecoveryFlow = ref(false);
const recoveredUploads = store.recoveredUploads;

function showRecoveryFlow() {
  isShowingRecoveryFlow.value = true;
}
</script>
