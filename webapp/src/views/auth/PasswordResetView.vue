<template>
  <AuthShell title="Reset your password">
    <form class="flex flex-col gap-4 mb-4" @submit.prevent="handleContinue()">
      <UiTextInput
        ref="emailInput"
        v-model="email"
        type="email"
        label="Email"
        placeholder="john.doe@example.com"
        fullWidth
        required
      />
      <div class="flex flex-col gap-1">
        <UiTextInput
          ref="codeInput"
          v-model="verificationCode"
          label="Enter code sent to your email"
          fullWidth
          required
        />
        <div class="text-gray-400 flex justify-end">
          <span
            @click="requestEmailVerification()"
            class="cursor-pointer text-sm underline"
          >
            Resend verification
          </span>
        </div>
      </div>
      <UiTextInput
        v-model="password"
        type="password"
        label="New password"
        fullWidth
        required
      />
      <div>
        <UiButton primary fill submit :loading="loading">Continue</UiButton>
      </div>
    </form>
    <div class="text-sm text-gray-600 mt-2 mb-2">
      Or <router-link :to="{ name: 'login' }" class="underline">Log in with a different account</router-link>.
    </div>
  </AuthShell>
</template>
<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { UiButton, UiTextInput } from '@/components/ui';
import AuthShell from './AuthShell.vue';
import { logger, showToast, trpcClient } from '@/app-utils';
import { loginUserFromCredentials } from './auth-helpers';

const router = useRouter();
const route = useRoute();
const email = ref<string>();
const verificationCode = ref<string>();
const password = ref<string>();
const loading = ref(false);
const emailInput = ref<typeof UiTextInput>();
const codeInput = ref<typeof UiTextInput>();

onMounted(async () => {
  if (!route.query.email) {
    // no email set, go back to login
    router.push({ name: 'login' });
    return;
  }

  email.value = Array.isArray(route.query.email) ? route.query.email[0] as string : route.query.email;
  await requestEmailVerification();
  nextTick(() => codeInput.value?.focus());
});

async function requestEmailVerification() {
  if (!email.value) {
    emailInput.value?.focus();
    return;
  }

  try {
    await trpcClient.requestEmailVerification.mutate({ email: email.value });
    showToast('A verification code has been sent to your email', 'info');
  } catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e.message, e);
  }
}

async function handleContinue() {
  if (!email.value || !verificationCode.value || !password.value) return;
  try {
    loading.value = true;

    await trpcClient.resetPassword.mutate({
      email: email.value,
      code: verificationCode.value,
      password: password.value
    });

    await loginUserFromCredentials(email.value, password.value, router);
    
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