<template>
    <button
      :type="submit ? 'submit' : 'button'"
      class="inline-flex items-center justify-center gap-2 text-sm font-medium rounded-md shadow-sm lg:w-auto transition-all duration-200 ease-in"
      :class="classes"
    >
      <span v-if="loading"
        class="loading loading-spinner"
      ></span>
      <slot></slot>
    </button>
  </template>
  <script lang="ts" setup>
  import { computed } from 'vue';
  
  
  const props = defineProps<{
    loading?: boolean;
    sm?: boolean;
    lg?: boolean;
    primary?: boolean;
    error?: boolean;
    danger?: boolean;
    fill?: boolean;
    submit?: boolean;
  }>();
  
  const classes = computed(() => {
    const defaultBtn = !props.primary && !props.danger && !props.error;
    const defaultSize = !props.sm && !props.lg;

    return {
      'text-white bg-[#5B53FF] hover:bg-[#5237F9]': props.primary,
      'text-black border border-gray-200 bg-white hover:bg-gray-100': defaultBtn,
      'text-white bg-red-600 hover:bg-red-500': props.error || props.danger,
      'w-full': props.fill,
      'px-3 py-1': props.sm,
      'px-4 py-2': defaultSize,
      'px-4 py-3': props.lg
    }
  })
  </script>