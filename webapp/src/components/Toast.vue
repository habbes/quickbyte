<template>
  <div
    v-if="toasts.length"
    class="toast toast-bottom toast-right z-50 max-w-[100vw] w-full sm:max-w-[500px]"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="flex"
      :class="`alert alert-${toast.type} max-w-[100vw] whitespace-normal w-full`"
    >
      <div class="flex-1">
        {{ toast.message }}
      </div>
      <div>
        <XCircleIcon @click="closeToast(toast.id)" class="w-5 h-5 cursor-pointer text-gray-700 hover:text-gray-900" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { XCircleIcon  } from "@heroicons/vue/24/solid";
import { toasts, closeToast } from '@/app-utils';
</script>