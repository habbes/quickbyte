<template>
  <button ref="loginButton" type="button" class="flex justify-center items-center gap-3 rounded-md
  border border-gray-300 py-3 px-4 hover:bg-gray-100 active:bg-gray-200 font-Roboto font-medium">
    <GoogleIcon />
    <span class="text-gray-600">
      Sign in with Google
    </span>
  </button>
</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import GoogleIcon from './GoogleIcon.vue';
import { googleAuth, logger, showToast, trpcClient, type GoogleUser } from '@/app-utils';
import { loginUserFromToken } from './auth-helpers';
import { useRouter } from 'vue-router';

const router = useRouter();
const loginButton = ref<HTMLElement>();

onMounted(() => {
  if (!loginButton.value) {
    console.log('button not mounted');
    return;
  }
  googleAuth.value?.attachClickHandler(loginButton.value, {}, onLoginSuccess, onLoginFailure);
});

async function onLoginSuccess(googleUser: GoogleUser) {
  try {
    const idToken = googleUser.getAuthResponse().id_token;
    const result = await trpcClient.loginWithGoogle.mutate({ idToken });
    if (!('authToken' in result)) {
      // TODO: handle unverified user, show them a screen to verify the code
      return;
    }

    await loginUserFromToken(result.authToken, router);
  }
  catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e.message, e);
  }
}

function onLoginFailure(error: any) {
  console.log('google auth error', error);
}
</script>
