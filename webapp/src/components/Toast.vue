<template>
  <div class="toast toast-top toast-center z-50" v-if="toasts.length">
    <div v-for="toast in toasts" :key="toast.id" :class="`alert alert-${toast.type}`">
      {{ toast.message }}
    </div>
  </div>
</template>
<script lang="ts" setup>
import { toasts } from '@/app-utils';
</script>