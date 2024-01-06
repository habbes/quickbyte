<template>
  <AppShell>
    <router-view></router-view>
    <InvitesPromptWatcher />
  </AppShell>
</template>
<script lang="ts" setup>
import AppShell from '@/components/AppShell.vue';
import InvitesPromptWatcher from '@/components/InvitesPromptWatcher.vue';
</script>