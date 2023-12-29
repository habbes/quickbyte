<template>

</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { auth } from '@/app-utils';
import { ensure } from '@/core';

const route = useRoute();

onMounted(async () => {
  const inviteId = ensure(route.params.inviteId) as string;
  await auth.signInWithInvite(inviteId);
});

</script>