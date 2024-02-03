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

watch(authenticated, async () => {
  if (!authenticated.value) return;

  logger.log('Auth update, refreshing data');
  try {
    await initUserData();
  } catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e.message, e);
  }
});
</script>
