<template>
  <router-view v-if="authenticated" />
  <WelcomeView v-else />
</template>

<script setup lang="ts">
import { store, auth } from '@/app-utils'
import WelcomeView from "./WelcomeView.vue";

const authenticated = auth.isAuthenticated();
</script>
