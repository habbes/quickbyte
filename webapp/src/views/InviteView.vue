<template>

</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { auth } from '@/app-utils';
import { ensure } from '@/core';

const route = useRoute();

onMounted(async () => {
  // todo when landing on invite view
  // fetch/validate invite record
  // if no logged in user:
  //   show login/account page. After login prompt user to join project
  // if logged in user different from invited email:
  //    clear local cache, ask user to login, then prompt user to join project
  // if logged in user same email
  //     prompt user to join project
  const inviteId = ensure(route.params.inviteId) as string;
  await auth.signInWithInvite(inviteId);
});

</script>