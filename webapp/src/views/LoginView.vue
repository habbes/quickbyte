<template>
  <div class="h-dvh bg-white flex items-center sm:justify-center">
    <div class="flex-1 px-7 flex flex-col sm:max-w-[400px]">
      <div class="text-center mb-8">
        <Logo dark large />
      </div>
      <div class="mb-5">
        <h2 class="text-center text-gray-700">Log in to Quickbyte</h2>
      </div>
      <form class="flex flex-col gap-4 mb-4">
        <UiTextInput
          type="email"
          label="Email"
          placeholder="john.doe@example.com"
          fullWidth
        />
        <div>
          <UiButton primary fill>Continue</UiButton>
        </div>
      </form>
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
import { UiButton, UiTextInput } from '@/components/ui';
import Logo from '@/components/Logo.vue';
</script>