<template>
  <div class="font-bold font-Orbit" :class="classes">
    Quickbyte
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
  dark?: boolean;
  large?: boolean;
}>();

const classes = computed(() => {
  return {
    'text-white': !props.dark,
    'text-black': props.dark,
    'text-3xl': props.large,
    'text-lg': !props.large
  }
})
</script>