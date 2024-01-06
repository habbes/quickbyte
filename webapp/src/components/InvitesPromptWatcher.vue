<template>
  <Dialog
    ref="dialog"
    title="Join projects"
  >
    <div>
      <div v-for="invite in invites" :key="invite._id" class="flex flex-col gap-2">
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
            @click="acceptInvite(invite._id)"
            class="btn btn-primary btn-sm"
          >Accept</button>
          <button
            @click="declineInvite(invite._id)"
            class="btn btn-default btn-sm"
          >Decline</button>
        </div>
      </div>
    </div>
  </Dialog>
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";
import { logger, showToast, store, trpcClient } from "@/app-utils";
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

async function declineInvite(id: string) {
  const user = ensure(store.userAccount.value);
  try {
    // optimisitically remove the invite
    store.removeInvite(id);
    await trpcClient.declineInvite.mutate({ id, email: user.email });
    showToast('Invitation declined.', 'info');
    dialog.value?.close();
  }
  catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}

async function acceptInvite(id: string) {
  const user = ensure(store.userAccount.value);
  try {
    const resource = await trpcClient.acceptInvite.mutate({ id , email: user.email, name: user.name });
    store.removeInvite(id);
    if (resource.type === 'project' && resource.object) {
      store.addProject(resource.object);
    }

    dialog.value?.close();
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}
</script>