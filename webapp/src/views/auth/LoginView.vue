<template>
  <AuthShell title="Login to Quickbyte">
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
    <div class="text-sm text-gray-600 mt-2 mb-2">
      Don't have an account? <router-link :to="{ name: 'signup' }" class="underline">Sign up</router-link>.
    </div>
  </AuthShell>
</template>
<script lang="ts" setup>
import { nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { UiButton, UiTextInput } from '@/components/ui';
import AuthShell from './AuthShell.vue';
import { logger, showToast, trpcClient } from '@/app-utils';

const router = useRouter();
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
    } else if (!result.exists) {
      router.push({ name: 'signup', query: { email: email.value }});
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