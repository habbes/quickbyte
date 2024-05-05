<template>
  <div class="flex" :class="classes" :style="style">
    <slot></slot>
  </div>
</template>
<script lang="ts" setup>
import { computed, type StyleValue } from 'vue';

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
  fullWidth?: boolean;
}>();

const classes = computed(() => {
  return {
    'flex-1': props.fill,
    'flex-col': !props.horizontal,
    'items-center': props.itemsCenter,
    'items-between': props.itemsBetween,
    'justify-center': props.justifyCenter,
    'justify-between': props.justifyBetween,
    'justify-end': props.justifyEnd,
    [`gap-${props.gap}`]: props.gap,
    'gap-2': props.gapSm,
    'px-4 py-2': props.innerSpace,
    'px-4': props.horizontalSpace,
    'overflow-y-auto': props.verticalScroll,
    'w-full': props.fullWidth
  }
});

const style = computed(() => {
  // I use styles for fixed height because I can't get
  // tailwind to work reliably when custom heights with calc. Maybe
  // it's a syntax issue.
  const styles: StyleValue = {};
  if (props.fixedHeight !== undefined && props.fixedHeight !== null) {
    styles.height = props.fixedHeight
  }

  return styles;
});
</script>