<template>
  <UiDialog ref="dialog" :title="'Delete folder'">
    <div>Are you sure you want to delete "<span class="font-bold">{{ folder.name }}</span>"?</div>
    <div><span class="text-bold">If you proceed, the folder and all its contents will be removed.</span></div>
    <template #actions>
      <div class="flex gap-2">
        <UiButton @click="close()">Cancel</UiButton>
        <UiButton @click="deleteFolder()" danger>Delete</UiButton>
      </div>
    </template>
  </UiDialog>
</template>
<script lang="ts" setup>
import { UiDialog, UiButton } from "@/components/ui";
import type { Folder } from "@quickbyte/common";
import { ref } from "vue";
import { logger, showToast, trpcClient } from "@/app-utils";

const props = defineProps<{
  folder: Folder
}>();

const emit = defineEmits<{
  (e: 'delete', folderId: string): void;
}>();

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();
const name = ref<string>();

function open() {
  name.value = props.folder.name;
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}

async function deleteFolder() {
  if (!name.value) return;
  try {
    await trpcClient.deleteFolder.mutate({
      id: props.folder._id,
      projectId: props.folder.projectId
    });

    emit('delete', props.folder._id);
    showToast(`'${props.folder.name}' deleted successfully.`, 'info');
    close();
  } catch (e: any) {
    showToast(e.message, 'error');
    logger?.error(e.message, e);
  }
}
</script>