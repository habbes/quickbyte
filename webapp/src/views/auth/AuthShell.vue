<template>
  <div class="h-dvh bg-white flex items-center sm:justify-center">
    <div class="flex-1 px-7 flex flex-col sm:max-w-[400px]">
      <div class="text-center mb-8">
        <Logo dark large />
      </div>
      <div class="mb-5">
        <h2 class="text-center text-gray-700">{{ title }}</h2>
      </div>
      <slot></slot>
      <div class="text-xs text-gray-400">
        By using Quickbyte, you agree to our
        <a
          href="https://www.iubenda.com/terms-and-conditions/64965646"
          target="_blank"
          class="underline"
        >
          Terms of Service
        </a>
        and
        <a
          href="https://www.iubenda.com/terms-and-conditions/64965646"
          target="_blank"
          class="underline"
        >
          Privacy Policy
        </a>.
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Logo from '@/components/Logo.vue';

defineProps<{
  title: string;
}>();
</script>