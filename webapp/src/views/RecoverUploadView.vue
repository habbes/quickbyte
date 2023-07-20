<template>
  <div>Upload id {{ uploadId }}</div>
</template>
<script lang="ts" setup>
import { ensure } from '@/core';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const uploadId = computed(() => {
  const id = ensure(route.params.uploadId);

  if (typeof id !== 'string') {
    throw new Error('Found multiple upload ids in the path params');
  }

  return id;
});
</script>