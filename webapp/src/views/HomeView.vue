<template>
  <router-view v-if="userAccount" />
  <SignInView v-else />
</template>

<script setup lang="ts">
import { store } from '@/app-utils'
import SignInView from "./SignInView.vue";

const userAccount = store.userAccount;
</script>
