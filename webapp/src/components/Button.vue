<template>
    <button type="button" class="btn" :class="classes">
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
    xs?: boolean;
    lg?: boolean;
    xl?: boolean;
    primary?: boolean;
    error?: boolean;
    secondary?: boolean;
    warning?: boolean;
    fill?: boolean;
  }>();
  
  const classes = computed(() => {
    return {
      'btn-sm': props.sm,
      'btn-lg': props.lg,
      'btn-xl': props.xl,
      'btn-xs': props.xs,
      'btn-primary': props.primary,
      'btn-secondary': props.secondary,
      'btn-error': props.error,
      'btn-warning': props.warning,
      'w-full': props.fill,
    }
  })
  </script>