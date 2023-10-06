<template>
  <Button primary @click="pay()" :loading="loading">
    <slot></slot>
  </Button>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import PaystackPop from '@paystack/inline-js';
import { apiClient, store, showToast, logger } from '@/app-utils';
import { ensure, type VerifyTransansactionResult } from '@/core';
import Button from './Button.vue';

// TODO: we hardcode this for now because
// we only have a few plans at the moment.
type PlanName = 'starterMonthly'|'starterAnnual';

const props = defineProps<{
  planName: PlanName
}>();

const emit = defineEmits<{
  (e: 'transaction', transaction: VerifyTransansactionResult): void;
}>();

const loading = ref(false);

async function pay() {
  const user = ensure(store.userAccount.value);
  try {
    loading.value = true;
    const result = await apiClient.initiateSubscription(user.account._id, { plan: props.planName });

    const paystackTx = PaystackPop.setup({
      key: result.transaction.metadata.key,
      email: user.email,
      // amount is required, but will be replaced by the plan's configured amount on Paystack
      amount: result.plan.price,
      plan: result.plan.providerIds.paystack,
      reference: result.transaction._id,
      callback: async (response) => {
        try {
          loading.value = true;
          const verifiedTx = await apiClient.getTransaction(user.account._id, result.transaction._id);
          emit('transaction', verifiedTx);
        } catch (e: any) {
          showToast(e.message, 'error');
          logger.error(e);
          loading.value = false;
        }
      },
      onClose: async () => {
        try {
          const cancelledTx = await apiClient.cancelTransaction(user.account._id, result.transaction._id);
          showToast('Transaction cancelled.', 'info');
        } catch (e: any) {
          showToast(e.message, 'error');
          logger.error(e);
        }
      }
    });
    
    paystackTx.openIframe();
  } catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e);
  } finally {
    loading.value = false;
  }
}
</script>