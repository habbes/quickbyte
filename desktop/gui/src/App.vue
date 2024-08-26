<template>
  <AppLayout>
    <router-view></router-view>
  </AppLayout>
</template>
<script setup lang="ts">
import { onMounted } from "vue";
import AppLayout from "@/components/AppLayout.vue";
import { requestTransfers } from "@/core";

onMounted(async () => {
  console.log('request transfers');
  await requestTransfers();
});
</script>
