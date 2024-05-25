<template>
  <UiDialog
    ref="dialog"
    :title="`${media.name} versions`"
  >
  </UiDialog>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { UiDialog } from "@/components/ui";
import type { Media } from "@quickbyte/common";

defineProps<{
  media: Media,
  selectedVersionId: string;
}>();

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();

function open() {
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}
</script>