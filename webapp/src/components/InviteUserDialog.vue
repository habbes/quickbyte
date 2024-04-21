<template>
  <Dialog ref="dialog" title="Invite users">
    <div class="flex flex-col gap-4">
      <div>
        <label for="inviteEmails" class="text-xs mb-2">Enter email addresses of the people to invite</label>
        <UiTextInput
          ref="emailInput"
          fullWidth
          v-model="email"
          :type="'email'"
          placeholder="john.doe@example.com;jane.doe@example.com"
        />
        <span v-if="emailError" class="text-sm text-error">
          {{ emailError }}
        </span>
      </div>
      <div class="flex flex-col gap-2">
        <div class="text-xs">
          Select the level of access the users will have on this project.
        </div>
        <UiRadioList v-model="role">
          <UiRadioListItem value="reviewer">
            <div class="font-semibold">Reviewer</div>
            <div class="font-light text-xs text-gray-500">
              Can view files and comments and post new comments.
            </div>
          </UiRadioListItem>
          <UiRadioListItem value="editor">
            <div class="font-bold">Editor</div>
            <div class="font-light text-xs text-gray-500">
              Can also upload files, update versions, and delete files they uploaded.
            </div>
          </UiRadioListItem>
          <UiRadioListItem value="admin">
            <div class="font-bold">Admin</div>
            <div class="font-light text-xs text-gray-500">
              Can also delete any files and add users to the project.
            </div>
          </UiRadioListItem>
        </UiRadioList>
      </div>
    </div>
    
    <template #actions>
      <UiButton primary @click="inviteUser()">Invite Users</UiButton>
      <UiButton @click="close()">Cancel</UiButton>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import Dialog from '@/components/ui/Dialog.vue';
import { ref } from 'vue';
import { ensure, pluralize } from '@/core';
import { showToast, store, logger, trpcClient } from '@/app-utils';
import { UiRadioList, UiRadioListItem, UiButton, UiTextInput } from "@/components/ui";
import { type NonOwnerRoleType } from "@quickbyte/common";

const dialog = ref<typeof Dialog>();
const emailInput = ref<HTMLInputElement>();
const email = ref<string>();
const emailError = ref<string>();
const role = ref<NonOwnerRoleType>("editor");

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

  const emails = email.value.split(/[,;]/g);
  const users = emails.map(e => ({ email: e.trim() }));
  const args = {
    projectId: props.projectId,
    users,
    role: role.value
  };

  try {
    await trpcClient.inviteUsersToProject.mutate(args)
    emit('invite', args.users);
    close();
    showToast(`Sent ${pluralize('invitation', args.users.length)} to ${args.users.length} ${pluralize('person', args.users.length, 'people')}.`, 'info');
  }
  catch (e: any) {
    showToast(`Failed to invite user: ${e.message}`, 'error');
    logger.error(e.message, e);
  }
  
}
</script>