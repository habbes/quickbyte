<template>
  <div class="flex flex-col items-center justify-center flex-1">
    <!-- <SubscriptionCard
      @transaction="goToTransaction($event)"
    /> -->
    <SubscriptionPlans />
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { type VerifyTransansactionResult } from '@/core';
import SubscriptionCard from '@/components/StarterSubscriptionCard.vue';
import { SubscriptionPlans } from '@/components/subscriptions';

const router = useRouter();

function goToTransaction(transaction: VerifyTransansactionResult) {
  router.push({ name: 'transaction', params: { transactionId: transaction._id }})
}
</script>