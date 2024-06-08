<template>
  <router-view />
  <Toast />
  <VueQueryDevtools />
</template>

<script setup lang='ts'>
import { onMounted, watch } from 'vue';
import { auth } from "@/app-utils";
import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
// AOS stands for Animate On Scroll, is a library that adds cool animations to elements as you scroll down a webpage.
import AOS from 'aos';
import Toast from '@/components/Toast.vue';

const authenticated = auth.isAuthenticated();

onMounted(async () => {
  AOS.init();
  auth.init();
});
</script>
