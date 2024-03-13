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
            @click="handleAccept(invite)"
            class="btn btn-primary btn-sm"
          >Accept</button>
          <button
            @click="handleDecline(invite)"
            class="btn btn-default btn-sm"
          >Decline</button>
        </div>
      </div>
    </div>
  </Dialog>
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { logger, showToast, store, acceptInvite, declineInvite } from "@/app-utils";
import Dialog from "@/components/ui/Dialog.vue";
import type { RecipientInvite } from "../../../common/dist";

const router = useRouter();
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

async function handleDecline(invite: RecipientInvite) {
  try {
    await declineInvite(invite._id, invite.secret);
    showToast('Invitation declined.', 'info');
    dialog.value?.close();
  }
  catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}

async function handleAccept(invite: RecipientInvite) {
  try {
    await acceptInvite(invite._id, invite.secret);

    dialog.value?.close();
    if (invite.resource.type === 'project') {
      // TODO:
      // we do a hard redirect instead of using the vue router because
      // because the app fetches all the projects at start up
      // ideally we should just fetch the project from the API
      // and it to the store then redirect. This was just a quick fix
      location.href = `${location.origin}/projects/${invite.resource.id}`;
    }
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}
</script>