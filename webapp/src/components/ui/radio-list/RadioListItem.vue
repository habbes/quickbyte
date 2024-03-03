<template>
  <div class="flex items-center gap-4 p-3 border border-gray-100 rounded-md w-full">
    <RadioGroupItem
      :value="value"
      class="bg-white w-[25px] h-[25px] rounded-full border shadow-sm border-blu-700 hover:bg-violet-50 focus:border-violet-600  outline-none cursor-default"
    >
      <RadioGroupIndicator
        class="flex items-center justify-center w-full h-full relative after:content-[''] after:block after:w-[11px] after:h-[11px] after:rounded-[50%] after:bg-violet-600"
      />
    </RadioGroupItem>
    <label>
      <slot></slot>
    </label>
  </div>
</template>
<script lang="ts" setup>
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'radix-vue'
import { ref } from 'vue'

defineProps<{
  value: string;
}>();

</script>