<template>
  <UploadView v-if="user" />
  <SignInView v-else />
</template>

<script setup lang="ts">
import { useUser } from '@/app-utils'
import SignInView from "./SignInView.vue";
import UploadView from "./UploadView.vue";

const user = useUser();
</script>
