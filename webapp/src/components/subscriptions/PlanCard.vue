<template>
  <div class="card bg-base-100 w-80 rounded-md border-2 border-gray-100">
    <div class="card-body">
      <h2 class="card-title flex justify-between text-gray-700 mb-6">
        {{ plan.displayName }}
      </h2>
      <ul class=" list-disc list-inside text-gray-600 text-sm h-24">
        <li v-for="feature in plan.features" :key="feature">
          {{ feature }}
        </li>
      </ul>
      <div class="border-t border-t-gray-200 mt-2 mb-2"></div>
      <div class="flex gap-1 justify-center items-center align-middle text-primary mb-2">
        <span>{{ plan.currency }}</span>
        <span class="font-bold text-xl">{{ annual ? plan.annualPrice / 12 : plan.monthlyPrice }}</span>
        <span> / month</span>
        <span v-if="annual && plan.annualPrice > 0" class="text-xs">(paid annually)</span>
      </div>
      <SubscribeButton :planName="planName" @transaction="$emit('transaction', $event)">
        Choose plan
      </SubscribeButton>
    </div>
  </div>
</template>
<script lang="ts" setup>
import SubscribeButton from '@/components/SubscribeButton.vue';
import type { VerifyTransansactionResult } from '@/core';
import { ref, computed } from 'vue';
import { store } from '@/app-utils';
import type { PlanDetails } from "./types";

const props = defineProps<{
  plan: PlanDetails;
  /**
   * Whether to show annual plans
   */
  annual: boolean;
}>();

defineEmits<{
  (e: 'transaction', transaction: VerifyTransansactionResult): void;
}>();

console.log('device data', store.deviceData.value);

const planName = computed<string>(() => props.annual ? props.plan.annualPlanName : props.plan.monthlyPlanName);
</script>