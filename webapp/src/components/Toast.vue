<template>
  <div class="toast toast-top toast-center z-50 max-w-[100vw] w-full" v-if="toasts.length">
    <div v-for="toast in toasts" :key="toast.id" :class="`alert alert-${toast.type} max-w-[100vw] whitespace-normal w-full`">
      {{ toast.message }}
    </div>
  </div>
</template>
<script lang="ts" setup>
import { toasts } from '@/app-utils';
</script>