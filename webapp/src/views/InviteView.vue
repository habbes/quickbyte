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
        <button
          @click="handleGetStarted()"
          class="btn btn-primary"
        >Get Started</button>
      </div>
    </div>
    <div v-else-if="loadError" class="p-5">
      <div class="alert alert-error">{{ loadError }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { logger, trpcClient, store, acceptInvite, declineInvite, showToast, auth } from '@/app-utils';
import { ensure } from '@/core';
import type { UserInviteWithSender } from '@quickbyte/common';
import EmptyNavBar from '@/components/EmptyNavBar.vue';

const route = useRoute();
const router = useRouter();
const invite = ref<UserInviteWithSender>();
const user = store.user;
const loadError = ref<string>();

onMounted(async () => {
  const inviteCode = ensure(route.params.inviteId) as string;
  try {
    invite.value = await trpcClient.verifyInvite.query(inviteCode);
    const user = store.user;

    if (user.value && (invite.value.email !== user.value.email)) {
      // different user is logged, clear the session
      // so the invited user can login
      auth.clearLocalSession();
    }
    
    
  } catch (e: any) {
    logger.error(e.message, e);
    loadError.value = e.message;
  }
  
});

async function handleAccept() {
  if (!invite.value) return;
  const inviteCode = ensure(route.params.inviteId) as string;

  try {
    const resource = await acceptInvite(invite.value._id, inviteCode);
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
  const inviteCode = ensure(route.params.inviteId) as string;

  try {
    await declineInvite(invite.value._id, inviteCode);
    router.push({ name: 'appHome' });
  } catch (e: any) {
    showToast(e.message, 'error');
    logger?.error(e.message, e);
  }
}

async function handleGetStarted() {
  await auth.forceSignInNewUser();
}

</script>