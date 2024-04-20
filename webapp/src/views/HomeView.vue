<template>
  <router-view v-if="authenticated" />
  <WelcomeView v-else />
</template>

<script setup lang="ts">
import { store, auth, redirectToLoginWithNextPath } from '@/app-utils'
import WelcomeView from "./WelcomeView.vue";
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const authenticated = auth.isAuthenticated();

onMounted(() => {
  // If navigating to a page other than the home page (i.e. authentication required)
  // then redirect to login
  if (route.path !== '/' && !authenticated.value) {
    redirectToLoginWithNextPath(router);
  }
});
</script>
