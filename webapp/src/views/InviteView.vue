<template>

</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { auth, logger, trpcClient, store } from '@/app-utils';
import { ensure } from '@/core';

const route = useRoute();

onMounted(async () => {
  const inviteCode = ensure(route.params.inviteId) as string;
  try {
    const invite = await trpcClient.verifyInvite.query(inviteCode);
    const user = store.user;

    if (user.value && (invite.email === user.value.email)) {
      // existing user. This should be taken care of by the invite prompt watcher
      // redirect to home page
    }
    else if (user.value) {
      // different user is logged
      await auth.signInWithInvite(inviteCode);
    }
    else {
      // ask user to login
      await auth.signInWithInvite(inviteCode);
    }

    // todo when landing on invite view
    // fetch/validate invite record
    // if no logged in user:
    //   show login/account page. After login prompt user to join project
    // if logged in user different from invited email:
    //    clear local cache, ask user to login, then prompt user to join project
    // if logged in user same email
    //     prompt user to join project
    
    
  } catch (e: any) {
    logger.error(e.message, e);
  }
  
});

</script>