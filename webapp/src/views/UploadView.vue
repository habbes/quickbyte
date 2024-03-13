<template>
  <div class="flex flex-col flex-1 gap-2 p-5 justify-center sm:items-center">
    <div class="alert alert-info sm:w-96 cursor-pointer" v-if="recoveredUploads.length && state === 'newUpload' " @click="showRecoveryFlow">
      We've detected incomplete transfers from a previous session.
      Click here to see the files.
    </div>
    <UploadCard v-if="state === 'newUpload'" />
    <UploadRecoveryFlow v-if="state === 'recoveryFlow'"
      @select-upload="recoverUpload"
      @done="completeRecoveryFlow()"
    />
    <RecoveryUploadCard
      v-if="state === 'recoveryUpload' && selectedRecoveredTransferId"
      :uploadId="selectedRecoveredTransferId"
      @complete="completeRecoveredUpload"
    />
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { store } from '@/app-utils';
import UploadCard from '@/components/UploadCard.vue';
import UploadRecoveryFlow from '@/components/UploadRecoveryFlow.vue';
import RecoveryUploadCard from '@/components/RecoveryUploadCard.vue';

type State = 'newUpload' | 'recoveryFlow' | 'recoveryUpload';

const router = useRouter();

onMounted(() => { 
  const account = store.currentAccount.value;
  if (!account?.subscription) {
    router.push({ name: 'pay' });
  }

  if (account?.subscription) {
    const subscription = account.subscription;
    if (subscription.status === 'inactive') {
      router.push({ name: 'pay' });
    }
    else if (subscription.status === 'pending') {
      router.push({
        name: 'transaction',
        params: { transactionId: subscription.lastTransactionId }
      });
    }
  }
});

const state = ref<State>('newUpload');
const selectedRecoveredTransferId = ref<string>();

const recoveredUploads = store.recoveredTransfers;

function showRecoveryFlow() {
  state.value = 'recoveryFlow';
}

function recoverUpload(id: string) {
  selectedRecoveredTransferId.value = id;
  state.value = 'recoveryUpload';
}

function completeRecoveredUpload() {
  state.value = 'newUpload';
}

function completeRecoveryFlow() {
  state.value = 'newUpload';
}
</script>
