<template>
  <AppLayout>
    <router-view></router-view>
  </AppLayout>
</template>
<script setup lang="ts">
import { onMounted } from "vue";
import { invoke } from '@tauri-apps/api'
import AppLayout from "@/components/AppLayout.vue";

onMounted(async () => {
  console.log(await invoke('greet', { name: 'World' }))
})
</script>
