<template>
  <div class="h-dvh bg-white flex items-center sm:justify-center">
    <div class="flex-1 px-7 flex flex-col sm:max-w-[400px]">
      <div class="text-center mb-8">
        <Logo dark large />
      </div>
      <div class="mb-5">
        <h2 class="text-center text-gray-700">Log in to Quickbyte</h2>
      </div>
      <form class="flex flex-col gap-4 mb-4" @submit.prevent="handleContinue()">
        <UiTextInput
          v-model="email"
          type="email"
          label="Email"
          placeholder="john.doe@example.com"
          fullWidth
          required
        />
        <UiTextInput
          ref="passwordInput"
          v-if="accountExists"
          type="password"
          label="Password"
          fullWidth
          required
        />
        <div>
          <UiButton primary fill submit :loading="loading">Continue</UiButton>
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
import { nextTick, ref } from 'vue';
import { UiButton, UiTextInput } from '@/components/ui';
import Logo from '@/components/Logo.vue';
import { logger, showToast, trpcClient } from '@/app-utils';

const email = ref<string>();
const loading = ref(false);
const accountExists = ref(false);
const passwordInput = ref<typeof UiTextInput>();

async function handleContinue() {
  if (!email.value) return;
  

  try {
    loading.value = true;
    const result = await trpcClient.getUserAuthMethod.query({
      email: email.value
    });

    if (result.exists && result.provider === 'email') {
      accountExists.value = true;
      nextTick(() => {
        passwordInput.value?.focus();
      });
    }
  }
  catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e.message, e);
  }
  finally {
    loading.value = false;
  }
}
</script>