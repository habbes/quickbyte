<template>
  <div class="w-full flex justify-center">
    <img :src="src" class="h-full">
  </div>
</template>
<script setup lang="ts">
defineProps<{
  src: string;
}>();
</script>