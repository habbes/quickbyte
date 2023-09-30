<template>
  <div class="flex flex-col items-center justify-center flex-1">
    <div v-if="loading" class="flex justify-center item-center">
      <span class="loading loading-spinner loading-lg text-purple-200"></span>
    </div>

    <VerifyTransactionCard
      v-if="transaction"
      :transaction="transaction"
    />
    <div v-if="error" class="alert alert-error w-96">
      {{ error }}
    </div>

    <div v-if="error" class="flex mt-2 w-96">
      <button class="btn flex-1" @click="fetchTransaction()">Retry</button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ensure, type VerifyTransansactionResult } from '@/core';
import VerifyTransactionCard from '@/components/VerifyTransactionCard.vue';
import { apiClient, store, logger } from '@/app-utils';

const transaction = ref<VerifyTransansactionResult>();
const error = ref<string>();
const loading = ref(false);

const route = useRoute();

onMounted(async () => {
  await fetchTransaction();
});

async function fetchTransaction() {
  try {
    error.value = undefined;
    const id = Array.isArray(route.params.transactionId) ? route.params.transctionId[0] : route.params.transactionId;
    ensure(id);
    loading.value = true;
    const account = ensure(store.userAccount.value?.account);
    
    transaction.value = await apiClient.getTransaction(account._id, id);
  } catch (e: any) {
    logger.error(e);
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>