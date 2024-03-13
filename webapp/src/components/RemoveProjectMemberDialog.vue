<template>
  <UiDialog ref="dialog" title="Remove member from the project.">
    <div>
      Are you sure you want to remove <b>{{ member.name }}</b> from the project?
    </div>
    <UiLayout horizontal justifyEnd gapSm>
      <UiButton danger @click="removeMember()">Remove member</UiButton>
      <UiButton @click="close()">Cancel</UiButton>
    </UiLayout>
  </UiDialog>
</template>
<script lang="ts" setup>
import type { RoleType, ProjectMember } from "@quickbyte/common";
import { UiDialog, UiLayout, UiButton } from "@/components/ui";
import { ref } from "vue";
import { logger, showToast, trpcClient } from "@/app-utils";

const props = defineProps<{
  member: ProjectMember;
  projectId: string;
}>();

const emit = defineEmits<{
  (e: 'removeMember', data: { memberId: string, projectId: string }): void;
}>();

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();
const role = ref<RoleType>(props.member.role);

function open() {
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}

async function removeMember() {
  try {
    await trpcClient.removeProjectMember.mutate({
      projectId: props.projectId,
      userId: props.member._id,
    });

    showToast(`${props.member.name} has been removed from the project.`, 'info');
    emit("removeMember", {
      memberId: props.member._id,
      projectId: props.projectId
    });

    close();
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}
</script>