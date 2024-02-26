<template>
    <DropdownMenuLabel
      :disabled="disabled"
      class="text-xs px-[20px] flex items-center h-[40px] leading-[25px] text-gray-500"
    >
      <slot></slot>
    </DropdownMenuLabel>
  </template>
  <script lang="ts" setup>
  import {
    DropdownMenuLabel
  } from 'radix-vue';
  
  defineProps<{
    disabled?: boolean;
  }>();
  </script>