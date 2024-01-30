<template>
  <UiDialog ref="dialog" :title="'Rename media file'">
    <input
      autofocus
      v-model="name"
      type="text"
      class="input w-full"
    />
    <template #actions>
      <div class="flex gap-2">
        <UiButton @click="close()">Cancel</UiButton>
        <UiButton @click="rename()" primary>Rename</UiButton>
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
  (e: 'rename', updatedMedia: Media): void;
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

async function rename() {
  if (!name.value) return;
  try {
    const result = await trpcClient.updateMedia.mutate({
      name: name.value,
      id: props.media._id,
      projectId: props.media.projectId
    });

    emit('rename', result);
    close();
  } catch (e: any) {
    showToast(e.message, 'error');
    logger?.error(e.message, e);
  }
}
</script>