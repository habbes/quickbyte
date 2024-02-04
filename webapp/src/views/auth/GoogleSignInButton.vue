<template>
  <button type="button" class="flex justify-center items-center gap-3 rounded-md
  border border-gray-300 py-3 px-4 hover:bg-gray-100 focus:bg-gray-200 font-Roboto font-medium">
    <GoogleIcon />
    <span class="text-gray-600">
      Sign in with Google
    </span>
  </button>
</template>
<script lang="ts" setup>
import GoogleIcon from './GoogleIcon.vue';
</script>