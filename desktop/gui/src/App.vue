<template>
  <AppLayout>
    <router-view></router-view>
  </AppLayout>
</template>
<script setup lang="ts">
import { onMounted } from "vue";
import AppLayout from "@/components/AppLayout.vue";
import { requestTransfers } from "@/core";
import { loadAppInfo, tryLoadStoredUserSession } from "@/app-utils";

onMounted(async () => {
  await loadAppInfo(),
  await requestTransfers();
  await tryLoadStoredUserSession();
});
</script>
