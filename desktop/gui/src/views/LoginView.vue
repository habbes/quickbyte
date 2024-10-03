<template>
  <div class="flex-1 h-full flex items-center justify-center">
    <div>
      <form
        @submit.prevent="login()"
        class="flex flex-col gap-4 w-[400px]"
      >
        <div class="text-sm text-gray-200">
          Sign in to your Quickbyte account to access your projects
        </div>
        <div>
          <UiTextInput
            label="Enter email"
            v-model="email"
            type="email"
            placeholder="Your account email"
            fullWidth
            required
          />
        </div>
        <div class="flex flex-col gap-1">
          <UiTextInput
            label="Enter password"
            v-model="password"
            placeholder="Your account password"
            type="password"
            fullWidth
            required
          />
          <div class="text-xs flex items-center justify-end">
            <a href="https://quickbyte.io/auth/password-reset" target="_blank" class="text-gray-400 hover:text-gray-300">Forgot password?</a>
          </div>
        </div>
        <UiButton
          fill
          submit
          primary
          :loading="loading"
          :disabled="loading"
        >
          Login
        </UiButton>
        <OrSeparator />
        <div>
          <UiButton
            fill
            class=""
            @click="loginWithGoogle()"
          >
            <img class="w-5" :src="googleLogo"> Sign in with Google
          </UiButton>
        </div>
        <div class="flex text-xs w-full items-center justify-center">
          <p>
            Don't have an account?
            <a href="https://quickbyte.io/auth/signup" target="_blank" class="text-gray-400 hover:text-gray-300">Sign up on Quickbyte</a>.
          </p>
        </div>
      </form>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { message } from "@tauri-apps/api/dialog";
import { trpcClient, initUserData, setToken } from "@/app-utils";
import { UiTextInput, UiButton } from "@/components/ui";
import { loginWithGoogle, persistUserToken } from '@/core';
import googleLogo from '@/assets/google-g-logo.png'
import OrSeparator from "@/components/OrSeparator.vue";

const router = useRouter();
const email = ref<string>();
const password = ref<string>();
const loading = ref<boolean>(false);

async function login() {
  try {
    if (!email.value) {
      return;
    }

    if (!password.value) {
      return;
    }

    loading.value = true;

    // TODO: use getUserAuthMethod to check whether
    // user logs in with password or google
    const result = await trpcClient.login.mutate({
      email: email.value,
      password: password.value
    });

    if ('authToken' in result) {
      setToken(result.authToken.code);
      await persistUserToken(result.authToken.code);
    }

    await initUserData();
    router.push({ name: 'project' });
  }
  catch (e: any) {
    await message(`Error: ${e.message}`, { type: 'error' });
  }
  finally {
    loading.value = false;
  }
}
</script>