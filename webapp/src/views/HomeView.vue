<template>
  <router-view v-if="userAccount" />
  <WelcomeView v-else />
</template>

<script setup lang="ts">
import { store } from '@/app-utils'
import WelcomeView from "./WelcomeView.vue";

const userAccount = store.user;
</script>
