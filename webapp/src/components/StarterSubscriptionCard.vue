<template>
  <div class="card bg-base-100 w-96">
    <div class="card-body">
      <h2 class="card-title">Starter</h2>
      <ul class=" list-disc list-inside text-gray-600 text-sm">
        <li>Send up to 200GB per transfer</li>
        <li>Recover failed transfers within 7 days.</li>
        <li>500GB total storage size</li>
        <li>30-day transfer expiry</li>
        <li class="">More features coming soon</li>
      </ul>
      <div class="border-t border-t-gray-200 mt-2 mb-2"></div>
      <div class="flex gap justify-center items-center text-primary mb-2">
        <span class="font-bold text-xl">$6</span>
        <span> / month</span>
      </div>
      <SubscribeButton
        :planName="'starterMonthly'"
        @transaction="$emit('transaction', $event)"
      >
        Subscribe
      </SubscribeButton>
    </div>
  </div>
</template>
<script lang="ts" setup>
import SubscribeButton from '@/components/SubscribeButton.vue';
import type { VerifyTransansactionResult } from '@/core';

defineEmits<{
  (e: 'transaction', transaction: VerifyTransansactionResult): void;
}>();
</script>