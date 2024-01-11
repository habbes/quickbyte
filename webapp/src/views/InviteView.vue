<template>
  <div class="h-screen flex flex-col">
    <EmptyNavBar />
    <div v-if="invite" class="flex-1 flex flex-col mt-10 items-center gap-4">
      <div class="text-[#dad8d8]">
        <span class="font-bold">{{ invite.sender.name }}</span>
        has invited you to join
        <span class="font-bold underline">{{ invite?.resource.name }}</span> on Quickbyte.
        Click the button below to get started.
      </div>
      <div
        v-if="user && (user.email === invite.email)"
        class="flex gap-2"
      >
        <button
          @click="handleAccept()"
          class="btn btn-primary btn-sm"
        >
          Join Project
        </button>
        <button
          @click="handleDecline()"
          class="btn btn-error btn-sm"
        >
          Decline
        </button>
      </div>
      <div v-else>
        <button class="btn btn-primary">Get Started</button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { logger, trpcClient, store, acceptInvite, declineInvite, showToast } from '@/app-utils';
import { ensure } from '@/core';
import type { UserInviteWithSender } from '@quickbyte/common';
import EmptyNavBar from '@/components/EmptyNavBar.vue';

const route = useRoute();
const router = useRouter();
const invite = ref<UserInviteWithSender>();
const user = store.user;

onMounted(async () => {
  console.log('invite view mount');
  const inviteCode = ensure(route.params.inviteId) as string;
  console.log('invite code', inviteCode);
  try {
    invite.value = await trpcClient.verifyInvite.query(inviteCode);
    console.log('invite', invite);
    const user = store.user;

    console.log('invite', invite);
    console.log('user', user);

    if (user.value && (invite.value.email === user.value.email)) {
      // existing user. This should be taken care of by the invite prompt watcher
      // redirect to home page
      console.log('invited user is current user');
    }
    else if (user.value) {
      // different user is logged
      // await auth.signInWithInvite(inviteCode);
      console.log('invited user different from current user');
    }
    else {
      // ask user to login
      // await auth.signInWithInvite(inviteCode);
      console.log('no user currently signed in');
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

async function handleAccept() {
  if (!invite.value) return;

  try {
    const resource = await acceptInvite(invite.value._id);
    if (resource.type === 'project') {
      router.push({ name: 'project', params: { projectId: resource.id }});
    }
  } catch (e: any) {
    showToast(e.message, 'error');
    logger?.error(e.message, e);
  }
}

async function handleDecline() {
  if (!invite.value) return;

  try {
    await declineInvite(invite.value._id);
    router.push({ name: 'appHome' });
  } catch (e: any) {
    showToast(e.message, 'error');
    logger?.error(e.message, e);
  }
}

</script>