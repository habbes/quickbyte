<template>
  <AuthShell title="Create new account">
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
      <UiTextInput
        ref="nameInput"
        v-model="name"
        label="Full name"
        placeholder="John Doe"
        fullWidth
        required
      />
      <UiTextInput
        v-model="password"
        type="password"
        label="Password"
        fullWidth
        required
      />
      <div>
        <UiButton primary fill submit :loading="loading">Continue</UiButton>
      </div>
    </form>
  </AuthShell>
</template>
<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue';
import { useRoute } from "vue-router";
import { UiButton, UiTextInput } from '@/components/ui';
import AuthShell from './AuthShell.vue';
import { logger, showToast, trpcClient } from '@/app-utils';

const email = ref<string>();
const password = ref<string>();
const name = ref<string>();
const loading = ref(false);
const nameInput = ref<typeof UiTextInput>();
const emailInput = ref<typeof UiTextInput>();
const route = useRoute();

onMounted(() => {
  const queryEmail = Array.isArray(route.query.email) ? route.query.email[0] : route.query.email;
  if (queryEmail) {
    email.value = queryEmail;
    nextTick(() => nameInput.value?.focus());
  } else {
    nextTick(() => emailInput.value?.focus());
  }
});

async function handleContinue() {
  if (!email.value || !password.value || !name.value) return;
  
  try {
    loading.value = true;

    const result = await trpcClient.createUser.mutate({
      name: name.value,
      email: email.value,
      password: password.value
    });

    console.log('created user', result);

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