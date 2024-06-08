<template>
  <UiDialog ref="dialog" :title="'Rename folder'">
    <UiForm @submit="rename()">
      <UiLayout gapMd>
        <UiTextInput
          autofocus
          v-model="name"
          fullWidth
        />
        <UiLayout horizontal justifyEnd itemsCenter gapSm>
            <UiButton @click="close()">Cancel</UiButton>
            <UiButton primary submit>Rename</UiButton>
        </UiLayout>
      </UiLayout>
    </UiForm>
  </UiDialog>
</template>
<script lang="ts" setup>
import { UiDialog, UiLayout, UiButton, UiForm, UiTextInput } from "@/components/ui";
import type { Folder } from "@quickbyte/common";
import { ref } from "vue";
import { logger, showToast, trpcClient } from "@/app-utils";

const props = defineProps<{
  folder: Folder
}>();

const emit = defineEmits<{
  (e: 'rename', updatedFolder: Folder): void;
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

async function rename() {
  if (!name.value) return;
  try {
    const result = await trpcClient.updateFolder.mutate({
      name: name.value,
      id: props.folder._id,
      projectId: props.folder.projectId
    });

    emit('rename', result);
    close();
  } catch (e: any) {
    showToast(e.message, 'error');
    logger?.error(e.message, e);
  }
}
</script>