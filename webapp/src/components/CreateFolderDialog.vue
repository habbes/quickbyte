<template>
  <UiDialog ref="dialog" title="New folder">
    <UiLayout gapSm>
      <UiLayout>
        <UiTextInput fullWidth v-model="name" label="Folder name" placeholder="Enter folder name" />
      </UiLayout>
      <UiLayout horizontal gapSm justifyEnd>
        <UiButton @click="createFolder()" primary>Create folder</UiButton>
        <UiButton @click="close()">Cancel</UiButton>
      </UiLayout>
    </UiLayout>
  </UiDialog>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { wrapError, trpcClient, showToast } from "@/app-utils";
import { UiDialog, UiTextInput, UiLayout, UiButton } from "@/components/ui";
import type { CreateFolderArgs, Folder } from "@quickbyte/common";

const props = defineProps<{
  projectId: string;
  parentId?: string;
}>();

const emit = defineEmits<{
  (e: 'createFolder', folder: Folder): void;
}>();

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();
const name = ref<string>();

function open() {
  name.value = "";
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}

async function createFolder() {
  await wrapError(async () => {
    if (!name.value) {
      return;
    }

    const args: CreateFolderArgs = {
      name: name.value,
      projectId: props.projectId
    };

    if (props.parentId) {
      args.parentId = props.parentId;
    }

    const result = await trpcClient.createFolder.mutate(args);
    emit('createFolder', result);
    showToast(`Folder '${result.name}' has been created successfully`, 'info');
    close();
  });
}

</script>