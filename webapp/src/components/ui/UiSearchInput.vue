<template>
  <div class="text-gray-700 font-bold flex gap-2 items-center w-full relative">
    <MagnifyingGlassIcon class="w-5 h-5 absolute left-2" />
    <input
      v-model="model"
      type="text"
      :placeholder="placeholder"
      class="input flex-1 pl-8 bg-transparent border-gray-700"
    >
  </div>
</template>
<script lang="ts" setup>
import { MagnifyingGlassIcon } from '@heroicons/vue/24/solid';

const model = defineModel();

defineProps<{
  placeholder?: string;
}>();
</script>