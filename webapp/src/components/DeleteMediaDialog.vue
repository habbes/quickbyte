<template>
  <UiDialog ref="dialog" :title="'Delete media file'">
    <div>Are you sure you want to delete "<span class="font-bold">{{ media.name }}</span>"?</div>
    <template #actions>
      <div class="flex gap-2">
        <UiButton @click="close()">Cancel</UiButton>
        <UiButton @click="deleteMedia()" danger>Delete</UiButton>
      </div>
    </template>
  </UiDialog>
</template>
<script lang="ts" setup>
import { UiDialog, UiButton } from "@/components/ui";
import type { Media } from "@quickbyte/common";
import { ref } from "vue";
import { logger, showToast, trpcClient } from "@/app-utils";

const props = defineProps<{
  media: Media
}>();

const emit = defineEmits<{
  (e: 'delete', mediaId: string): void;
}>();

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();
const name = ref<string>();

function open() {
  name.value = props.media.name;
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}

async function deleteMedia() {
  if (!name.value) return;
  try {
    await trpcClient.deleteMedia.mutate({
      id: props.media._id,
      projectId: props.media.projectId
    });

    emit('delete', props.media._id);
    showToast(`'${props.media.name}' deleted successfully.`, 'info');
    close();
  } catch (e: any) {
    showToast(e.message, 'error');
    logger?.error(e.message, e);
  }
}
</script>