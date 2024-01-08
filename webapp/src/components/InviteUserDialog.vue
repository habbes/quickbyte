<template>
  <Dialog ref="dialog" title="Invite user">
    <div>
      <input ref="emailInput" v-model="email" type="email" class="input input-bordered input-sm w-full" placeholder="Enter email address"/>
      <span v-if="emailError" class="text-sm text-error">
        {{ emailError }}
      </span>
    </div>
    
    <template #actions>
      <button @click="inviteUser()" class="btn btn-primary btn-sm">Invite User</button>
      <button class="btn btn-sm" @click="close()">Cancel</button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import Dialog from '@/components/ui/Dialog.vue';
import { ref } from 'vue';
import { ensure, type RoleType } from '@/core';
import { apiClient, showToast, store, logger } from '@/app-utils';

const dialog = ref<typeof Dialog>();
const emailInput = ref<HTMLInputElement>();
const email = ref<string>();
const emailError = ref<string>();

const account = ensure(store.currentAccount.value);

const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits<{
  (e: 'invite', users: { email: string }[]): void
}>();

defineExpose({ open, close });

function reset() {
  email.value = '';
}

function open() {
  reset();
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}

async function inviteUser() {
  if (!email.value) {
    emailError.value = 'Email is required';
    emailInput.value?.focus();
    return;
  }

  const args = {
    users: [{ email: email.value }],
    role: 'editor' as RoleType
  }

  try {
    await apiClient.inviteUsersToProject(account._id, props.projectId, args);
    emit('invite', [{ email: email.value }]);
    close();
    showToast('Sent invitations to users.', 'info');
  }
  catch (e: any) {
    showToast(`Failed to invite user: {$e.message}`, 'error');
    logger.error(e.message, e);
  }
  
}
</script>