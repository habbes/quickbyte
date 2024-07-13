<template>
  <div class="h-[48px] border-b border-b-[#120c11] flex flex-row items-center justify-between px-5">
    <div title="Exit comparison view">
      <XMarkIcon class="h-5 w-5 hover:text-white hover:cursor-pointer" @click="$emit('close')" />
    </div>
    <UiLayout horizontal itemsCenter gapSm class="overflow-hidden">
      {{ title }}
    </UiLayout>
    <div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { XMarkIcon } from '@heroicons/vue/24/outline';

defineProps<{
  title: string;
}>();

defineEmits<{
  (e: 'close'): unknown;
}>();
</script>