<template>
  <div
    class="radial-progress bg-primary text-primary-content border-4 border-primary"
    :style="{ '--value': Math.floor(progressPercentage) }">
      {{ Math.floor(progressPercentage)}}%
  </div>
</template>
<script lang="ts" setup>
defineProps<{
  progressPercentage: number;
}>();
</script>