<template>
  <button
    :type="submit ? 'submit' : 'button'"
    class="inline-flex items-center justify-center gap-2 text-sm font-medium rounded-sm shadow-sm transition-all duration-200 ease-in"
    :class="classes"
    :disabled="disabled"
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
  disabled?: boolean;
}>();

const classes = computed(() => {
  const defaultBtn = !props.primary && !props.danger && !props.error;
  const defaultSize = !props.sm && !props.lg;

  return {
    'text-white bg-[#5B53FF] hover:bg-[#5237F9]': props.primary,
    'text-black border border-gray-200 bg-white hover:bg-gray-100': defaultBtn && !props.disabled,
    'text-white bg-red-600 hover:bg-red-500': (props.error || props.danger) && !props.disabled,
    'bg-opacity-50 hover:bg-opacity-50 hover:auto': props.primary && props.disabled,
    'bg-gray-500 text-gray-400 border border-gray-400 hover:auto': props.disabled && !props.primary,
    'w-full': props.fill,
    'px-3 py-1': props.sm,
    'px-4 py-2': defaultSize,
    'px-4 py-3': props.lg
  }
})
</script>