<template>
  <DropdownMenuItem
    :disabled="disabled"
    class="group text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[40px] relative px-[20px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1 cursor-pointer hover:bg-violet-50"
  >
    <slot></slot>
  </DropdownMenuItem>
</template>
<script lang="ts" setup>
import {
  DropdownMenuItem
} from 'radix-vue';

defineProps<{
  disabled?: boolean;
}>();
</script>