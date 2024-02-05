<template>
  <router-view />
  <Toast />
</template>

<script setup lang='ts'>
import { onMounted, watch } from 'vue';
import { initUserData, logger, auth, showToast } from "@/app-utils";
// AOS stands for Animate On Scroll, is a library that adds cool animations to elements as you scroll down a webpage.
import AOS from 'aos';
import Toast from '@/components/Toast.vue';

const authenticated = auth.isAuthenticated();

onMounted(async () => {
  AOS.init();
  auth.init();
});
</script>
