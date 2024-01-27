<template>
  <div class="flex" :class="classes" :style="{ 'height': `${fixedHeight}px`}">
    <slot></slot>
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
  fill?: boolean;
  horizontal?: boolean;
  itemsCenter?: boolean;
  itemsBetween?: boolean;
  justifyCenter?: boolean;
  justifyBetween?: boolean;
  justifyEnd?: boolean;
  gap?: number;
  gapSm?: boolean;
  innerSpace?: boolean;
  horizontalSpace?: boolean;
  verticalScroll?: boolean;
  fixedHeight?: string;
  fullWidth?: string;
}>();

const classes = computed(() => {
  return {
    'flex-1': props.fill,
    'flex-col': !props.horizontal,
    'items-center': props.itemsCenter,
    'items-between': props.itemsBetween,
    'justify-center': props.justifyCenter,
    'justify-between': props.justifyBetween,
    [`gap-[${props.gap}]`]: props.gap,
    'gap-2': props.gapSm,
    'px-4 py-2': props.innerSpace,
    'px-4': props.horizontalSpace,
    'overflow-y-auto': props.verticalScroll,
    [`h-[${props.fixedHeight}]`]: props.fixedHeight,
    'w-full': props.fullWidth
  }
})
</script>