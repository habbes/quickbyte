<template>
  <img :src="src" class="h-full">
</template>
<script setup lang="ts">
defineProps<{
  src: string;
}>();
</script>