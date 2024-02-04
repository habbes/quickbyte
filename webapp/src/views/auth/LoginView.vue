<template>
  <AuthShell title="Login to Quickbyte" v-if="!user">
    <form class="flex flex-col gap-4 mb-4" @submit.prevent="handleContinue()">
      <UiTextInput v-model="email" type="email" label="Email" placeholder="john.doe@example.com" fullWidth required />
      <div v-if="accountExists" class="flex flex-col gap-1">
        <UiTextInput v-model="password" ref="passwordInput" type="password" label="Password" fullWidth required />
        <div class="text-gray-400 flex justify-end">
          <router-link :to="{ name: 'password-reset', query: { email } }">Forgot password?</router-link>
        </div>
      </div>
      
      
      <div>
        <UiButton primary fill submit :loading="loading">Continue</UiButton>
      </div>
    </form>
    
    <AuthMethodSeparator class="mb-3" />

    <GoogleSignInButton />
    <div class="text-sm text-gray-600 mt-2 mb-2">
      Don't have an account? <router-link :to="{ name: 'signup' }" class="underline">Sign up</router-link>.
    </div>
  </AuthShell>
  <EmailVerificationStep
    v-else-if="user && !user.verified && password"
    :email="user.email" :password="password"
    @verificationSuccess="handleVerificationSuccess()"
  />
</template>
<script lang="ts" setup>
import { nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { UiButton, UiTextInput } from '@/components/ui';
import AuthShell from './AuthShell.vue';
import EmailVerificationStep from './EmailVerificationStep.vue';
import { auth, initUserData, logger, showToast, store, trpcClient } from '@/app-utils';
import type { FullUser } from "@quickbyte/common";
import { loginUserFromCredentials, loginUserFromToken } from './auth-helpers';
import { ensure } from '@/core';
import GoogleSignInButton from './GoogleSignInButton.vue';
import AuthMethodSeparator from './AuthMethodSeparator.vue';

const router = useRouter();
const email = ref<string>();
const password = ref<string>();
const loading = ref(false);
const accountExists = ref(false);
const passwordInput = ref<typeof UiTextInput>();
const user = ref<FullUser>();

async function handleContinue() {
  if (!email.value) return;


  try {
    loading.value = true;
    // if account doesn't exist, it means
    // we haven't yet checked the user auth methods,
    // if we check the user auth method and account still doesn't exit,
    // the user is redirected to sign up page
    if (!accountExists.value) {
      await checkUserAUthMethod();
    } else {
      await login();
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

async function checkUserAUthMethod() {
  if (!email.value) return;
  const result = await trpcClient.getUserAuthMethod.query({
    email: email.value
  });

  if (result.exists && result.provider === 'email') {
    accountExists.value = true;
    nextTick(() => {
      passwordInput.value?.focus();
    });
  } else if (!result.exists) {
    router.push({ name: 'signup', query: { email: email.value } });
  }
}

async function login() {
  if (!email.value || !password.value) {
    return;
  }

  const result = await trpcClient.login.mutate({
    email: email.value,
    password: password.value
  });

  if ('authToken' in result) {
    await loginUserFromToken(result.authToken, router);
  } else {
    user.value = result.user;
  }
}

async function handleVerificationSuccess() {
  await loginUserFromCredentials(
    ensure(email.value),
    ensure(password.value),
    router
  );
}
</script>