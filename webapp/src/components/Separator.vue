<template>
  <div class="border-t border-t-base-200 my-2" :class="classes"></div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
  dashed?: boolean;
}>();

const classes = computed(() => {
  return {
    'border-dashed': props.dashed
  };
});
</script>