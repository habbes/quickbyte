<template>
  <button type='button' class="btn" @click="pay()">
    <slot></slot>
  </button>
</template>
<script lang="ts" setup>
import PaystackPop from '@paystack/inline-js';
import { apiClient, store } from '@/app-utils';
import { ensure } from '@/core';

// TODO: we hardcode this for now because
// we only have one plan at the moment.
type PlanName = 'starterMonthly';

const props = defineProps<{
  planName: PlanName
}>();


async function pay() {
  const user = ensure(store.userAccount.value);
  const result = await apiClient.initiateSubscription(user.account._id, { plan: props.planName });

  const paystackTx = PaystackPop.setup({
    key: result.transaction.metadata.key,
    email: user.email,
    // amount is required, but will be replaced by the plan's configured amount on Paystack
    amount: result.plan.price,
    plan: result.plan.providerIds.paystack,
    reference: result.transaction._id,
    callback: async (response) => {
      console.log('resp', response);
      // TODO: verify transaction on the server
      const verifiedTx = await apiClient.getTransaction(user.account._id, result.transaction._id);
      console.log('verified tx', verifiedTx);
    },
    onClose: () => {
      console.log('closed');
      // TODO: cancel transaction
    }
  });
  
  paystackTx.openIframe();
}
</script>