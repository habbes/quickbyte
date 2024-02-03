<template>
  <AuthShell title="Enter the verification code sent to your email.">
    <form class="flex flex-col gap-4 mb-4" @submit.prevent="handleContinue()">
      <UiTextInput v-model="code" label="Verification code" placeholder="123456" fullWidth required />
      <div>
        <UiButton primary fill submit :loading="loading">Verify</UiButton>
      </div>
    </form>
  </AuthShell>
</template>
<script lang="ts" setup>
import { nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { UiButton, UiTextInput } from '@/components/ui';
import AuthShell from './AuthShell.vue';
import { logger, showToast, trpcClient } from '@/app-utils';
import type { UserWithAccount } from '@quickbyte/common';

defineProps<{
  user: UserWithAccount
}>();

const code = ref<string>();
const loading = ref(false);

async function handleContinue() {
  try {
    loading.value = true;
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