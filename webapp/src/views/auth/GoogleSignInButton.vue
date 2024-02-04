<template>
  <!-- <button ref="loginButton" type="button" class="flex justify-center items-center gap-3 rounded-md
  border border-gray-300 py-3 px-4 hover:bg-gray-100 active:bg-gray-200 font-Roboto font-medium">
    <GoogleIcon />
    <span class="text-gray-600">
      Sign in with Google
    </span>
  </button> -->
  <div ref="loginButton"></div>
</template>
<script lang="ts" setup>
import { ref, watch } from 'vue';
import {  googleAuth, googleUser, logger, showToast, trpcClient } from '@/app-utils';
import { loginUserFromToken } from './auth-helpers';
import { useRouter } from 'vue-router';

const router = useRouter();
const loginButton = ref<HTMLElement>();

watch([loginButton, googleAuth], () => {
  console.log('login button', loginButton.value, 'googleAuth', googleAuth.value);
  if (!loginButton.value) return;

  if (!googleAuth.value) {
    console.log('google auth not initialized');
    return;
  }

  googleAuth.value.renderButton(loginButton.value, {
    type: 'standard',
    size: 'large',
    width: 344,
    logo_alignment: 'center'
  });

});

watch([googleUser], async () => {
  if (!googleUser.value) return;
  // user signed in
  try {
    const result = await trpcClient.loginWithGoogle.mutate({
      idToken: googleUser.value.credential
    });

    if (!('authToken' in result)) {
      // TODO: handle unverified user
      return;
    }

    await loginUserFromToken(result.authToken, router);

  } catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e.message, e);
  }
});
</script>
