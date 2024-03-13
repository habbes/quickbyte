<template>
  <UiLayout class="border border-[#2e2634] rounded-md p-4 sm:p-8 sm:w-2/3 sm:mx-auto">
    <UiLayout gapSm>
      <UiLayout>
        <h3 class="text-lg text-gray-200">
          {{ title }}
        </h3>
      </UiLayout>
      <slot></slot>
    </UiLayout>
  </UiLayout>
</template>
<script lang="ts" setup>
import { UiLayout } from "@/components/ui";

defineProps<{
  title: string;
}>();

</script>