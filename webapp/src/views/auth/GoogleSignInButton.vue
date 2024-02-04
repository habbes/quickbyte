<template>
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
  if (!loginButton.value) return;

  if (!googleAuth.value) {
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
