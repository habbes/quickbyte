<template>
  <div>
    <div class="flex justify-center mb-2">
      <div class="text-lg flex gap-2 items-center">
        <span>Monthly</span>
        <input type="checkbox" v-model="isAnnual" class="toggle toggle-xs toggle-primary" checked />
        <span>Annually <span class="text-xs">(save 16%)</span></span>
      </div>
    </div>
    <div class="flex flex-col sm:flex sm:flex-row sm:items-stretch gap-2 overflow-y-auto">
      <PlanCard
        v-for="plan in plans"
        :key="plan.displayName"
        :plan="plan"
        :annual="isAnnual"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import type { PlanDetails } from "./types";
import PlanCard from "./PlanCard.vue";

const isAnnual = ref(true);


const plans: PlanDetails[] = [
  {
    displayName: 'Free',
    currency: 'KES',
    annualPrice: 0,
    monthlyPrice: 0,
    monthlyPlanName: 'freeTier',
    annualPlanName: 'freeTier',
    features: [
      'Send up to 3GB per transfer',
      '3GB total storage',
      '7-day transfer expiry'
    ]
  },
  {
    displayName: 'Early Bird',
    currency: 'KES',
    annualPrice: 9000,
    monthlyPrice: 900,
    monthlyPlanName: 'earlyBirdMonthly',
    annualPlanName: 'earlyBirdAnnual',
    features: [
      'Send up to 200GB per transfer',
      '500GB total storage',
      '30-day transfer expiry',
      'More features coming soon'
    ]
  }
]
</script>