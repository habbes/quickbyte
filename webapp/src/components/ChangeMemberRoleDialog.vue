<template>
  <UiDialog ref="dialog" title="Change member's role">
    <div>
      Select the access level that <b>{{ member.name }}</b> will have in the project.
    </div>
    <RoleSelector v-model="role" />
    <UiLayout horizontal justifyEnd gapSm>
      <UiButton primary @click="changeRole()">Change role</UiButton>
      <UiButton @click="close()">Cancel</UiButton>
    </UiLayout>
  </UiDialog>
</template>
<script lang="ts" setup>
import type { RoleType, ProjectMember } from "@quickbyte/common";
import { UiDialog, UiLayout, UiButton } from "@/components/ui";
import RoleSelector from "./RoleSelector.vue"
import { ref } from "vue";
import { logger, showToast, trpcClient } from "@/app-utils";

const props = defineProps<{
  member: ProjectMember;
  projectId: string;
}>();

defineExpose({ open, close });
const emit = defineEmits<{
  (e: 'roleUpdate', data: { memberId: string, projectId: string, role: RoleType }): void;
}>();

const dialog = ref<typeof UiDialog>();
const role = ref<RoleType>(props.member.role);

function open() {
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}

async function changeRole() {
  try {
    if (role.value === 'owner') {
      // TODO: we shouldn't be able to reach this block in the first place.
      // But TypeScript doesn't know that. Better safe than sorry :)
      throw new Error("Cannot change the role to owner");
    }

    await trpcClient.changeProjectMemberRole.mutate({
      projectId: props.projectId,
      userId: props.member._id,
      role: role.value
    });

    showToast(`Updated ${props.member.name}'s role to ${role.value}.`, 'info');
    emit("roleUpdate", {
      memberId: props.member._id,
      projectId: props.projectId,
      role: role.value
    });

    close();
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}
</script>