<template>
  <button type='button' class="btn" @click="pay()">
    <slot></slot>
  </button>
</template>
<script lang="ts" setup>
import PaystackPop from '@paystack/inline-js';
import { apiClient, store, showToast, logger } from '@/app-utils';
import { ensure, type VerifyTransansactionResult } from '@/core';

// TODO: we hardcode this for now because
// we only have one plan at the moment.
type PlanName = 'starterMonthly';

const props = defineProps<{
  planName: PlanName
}>();

const emit = defineEmits<{
  (e: 'transaction', transaction: VerifyTransansactionResult): void;
}>();

async function pay() {
  const user = ensure(store.userAccount.value);
  try {
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
          const verifiedTx = await apiClient.getTransaction(user.account._id, result.transaction._id);
          emit('transaction', verifiedTx);
        } catch (e: any) {
          showToast(e.message, 'error');
          logger.error(e);
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
  }
}
</script>