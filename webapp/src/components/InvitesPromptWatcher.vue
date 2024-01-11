<template>
  <Dialog
    ref="dialog"
    title="Join projects"
  >
    <div class="flex flex-col gap-4">
      <div v-for="invite in invites" :key="invite._id" class="flex flex-col gap-2 border-t border-t-slate-200 py-4">
        <div v-if="invite.resource.type === 'project' && invite.resource.name">
          <span class="font-bold">{{ invite.sender.name }}</span> <span class="italic">({{ invite.sender.email }})</span>
          invited you to join project <span class="font-bold">{{ invite.resource.name }}</span>.
        </div>
        <div v-else-if="invite.resource.name">
          <span class="font-bold">{{ invite.sender.name }}</span> <span class="italic">({{ invite.sender.email }})</span>
          invited you to join <span class="font-bold">{{ invite.resource.name }}</span>.
        </div>
        <div v-else>
          <span class="font-bold">{{ invite.sender.name }}</span> <span class="italic">({{ invite.sender.email }})</span>
          invited you.
        </div>
        <div class="flex justify-end gap-2">
          <button
            @click="handleAccept(invite._id)"
            class="btn btn-primary btn-sm"
          >Accept</button>
          <button
            @click="handleDecline(invite._id)"
            class="btn btn-default btn-sm"
          >Decline</button>
        </div>
      </div>
    </div>
  </Dialog>
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";
import { logger, showToast, store, trpcClient, acceptInvite, declineInvite } from "@/app-utils";
import Dialog from "@/components/ui/Dialog.vue";
import { ensure } from "@/core";

const dialog = ref<typeof Dialog>();
const invites = store.invites;

watch(dialog, (value) => {
  if (value && invites.value.length) {
    dialog.value?.open();
  }
});

watch(store.invites, (invites, prev) => {
  if (!invites.length) {
    return;
  }

  // check if there's a new invite
  if (invites.every(invite => prev.find(i => i._id === invite._id))) {
    // no new invite has been added
    return;
  }

  dialog.value?.open();
});

async function handleDecline(id: string) {
  try {
    await declineInvite(id);
    showToast('Invitation declined.', 'info');
    dialog.value?.close();
  }
  catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}

async function handleAccept(id: string) {
  try {
    await acceptInvite(id);

    dialog.value?.close();
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}
</script>