<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4">
    <div class="text-white text-center mb-4">
      <p
        class="text-white text-center font-light text-4xl mb-10"
        style="font-family: 'Secular One'"
      >
        Quickbyte is the best way to transfer large files.
      </p>
      <p class="mb-4">
        Starting from just $6 a month.
      </p>
    </div>
    <LoginButton />
  </div>
</template>
<script lang="ts" setup>
import LoginButton from '@/components/LoginButton.vue';
</script>