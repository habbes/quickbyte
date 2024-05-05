<template>
  <UiDialog ref="dialog">

  </UiDialog>
</template>
<script lang="ts" setup>
import { UiDialog } from "@/components/ui";
import { ref } from "vue";

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();

function open() {
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}
</script>