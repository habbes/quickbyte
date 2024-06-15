<template>
  <UiDialog ref="dialog" :title="'Rename media asset'">
    <UiLayout>
      <UiForm @submit="rename()">
        <UiLayout gapSm>
          <UiTextInput
            v-model="name"
            fullWidth
          />
          <UiLayout horizontal itemsCenter justifyEnd gapSm>
            <UiButton @click="close()">Cancel</UiButton>
            <UiButton submit primary>Rename</UiButton>
          </UiLayout>
        </UiLayout>
      </UiForm>
    </UiLayout>
  </UiDialog>
</template>
<script lang="ts" setup>
import { UiDialog, UiLayout, UiForm, UiTextInput, UiButton } from "@/components/ui";
import type { Media } from "@quickbyte/common";
import { ref } from "vue";
import { logger, showToast, useUpdateMediaMutation } from "@/app-utils";

const props = defineProps<{
  media: Media
}>();

const emit = defineEmits<{
  (e: 'rename', updatedMedia: Media): void;
}>();

defineExpose({ open, close });

const mutation = useUpdateMediaMutation();
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
    const result = await mutation.mutateAsync({
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