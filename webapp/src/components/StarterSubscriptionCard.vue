<template>
  <div class="card bg-base-100 w-96">
    <div class="card-body">
      <h2 class="card-title flex justify-between">
        Starter
        <div class="text-xs flex gap-2 items-center">
          <span>Monthly</span>
          <input type="checkbox" v-model="isAnnual" class="toggle toggle-xs toggle-primary" checked />
          <span>Annually</span>
        </div>
      </h2>
      <ul class=" list-disc list-inside text-gray-600 text-sm">
        <li>Send up to 200GB per transfer</li>
        <li>Recover failed transfers within 7 days.</li>
        <li>500GB total storage size</li>
        <li>30-day transfer expiry</li>
        <li class="">More features coming soon</li>
      </ul>
      <div class="border-t border-t-gray-200 mt-2 mb-2"></div>
      <div class="flex gap-1 justify-center items-center align-middle text-primary mb-2">
        <span class="font-bold text-xl">${{ isAnnual ? '5' : '6' }}</span>
        <span> / month</span>
        <span v-if="isAnnual" class="text-xs">(paid annually)</span>
      </div>
      <SubscribeButton :planName="planName" @transaction="$emit('transaction', $event)">
        Subscribe
      </SubscribeButton>
    </div>
  </div>
</template>
<script lang="ts" setup>
import SubscribeButton from '@/components/SubscribeButton.vue';
import type { VerifyTransansactionResult } from '@/core';
import { ref, computed } from 'vue';

type PlanName = 'starterMonthly' | 'starterAnnual';

defineEmits<{
  (e: 'transaction', transaction: VerifyTransansactionResult): void;
}>();

const isAnnual = ref(true);
const planName = computed<PlanName>(() => isAnnual.value ? 'starterAnnual' : 'starterMonthly');


</script>