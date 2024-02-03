<template>
  <AuthShell title="Enter the verification code sent to your email.">
    <form class="flex flex-col gap-4 mb-4" @submit.prevent="handleVerify()">
      <UiTextInput v-model="code" label="Verification code" placeholder="123456" fullWidth required />
      <div>
        <UiButton primary fill submit :loading="loading">Verify</UiButton>
      </div>
    </form>
    <div class="text-sm text-gray-600">
      Didn't get the email? <span @click="handleResend()" class="underline text-primary cursor-pointer">Click to resend</span>.
    </div>
    <div class="text-sm text-gray-600 mt-2 mb-2">
      <router-link :to="{ name: 'login' }" class="underline">Or go back to login.</router-link>
    </div>
  </AuthShell>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import { UiButton, UiTextInput } from '@/components/ui';
import AuthShell from './AuthShell.vue';
import { logger, showToast, trpcClient } from '@/app-utils';
import type { UserWithAccount } from '@quickbyte/common';

const props = defineProps<{
  user: UserWithAccount
}>();

const code = ref<string>();
const loading = ref(false);

async function handleVerify() {
  if (!code.value) return;
  try {
    loading.value = true;

    const result = await trpcClient.verifyUserEmail.mutate({
      userId: props.user._id,
      code: code.value
    });
  }
  catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e.message, e);
  }
  finally {
    loading.value = false;
  }
}

async function handleResend() {
  try {
    await trpcClient.requestEmailVerification.mutate({
      userId: props.user._id,
      email: props.user.email
    });

    showToast('Verification code sent to your email.', 'info');
  }
  catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e.message, e);
  }
}
</script>