<template>
  <ProjectShareBaseDialog
    ref="dialog"
    :initialShare="share"
    :projectId="share.projectId"
    :defaultName="share.name"
    :title="title"
    :items="share.items!"
  />
</template>
<script lang="ts" setup>
import { ref } from "vue";
import type { ProjectShare } from "@quickbyte/common";
import { pluralize } from "@/core";
import ProjectShareBaseDialog from "./ProjectShareBaseDialog.vue";
import { computed } from "vue";

const props = defineProps<{
  share: ProjectShare
}>();

defineExpose({ open, close });

const dialog = ref<typeof ProjectShareBaseDialog>();

const title = computed(() =>
  props.share.items ?
  `Sharing ${props.share.items.length} ${pluralize('item', props.share.items.length)}`
  : props.share.allItems ? 'Sharing all project items' : 'Sharing project items');

function open() {
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}
</script>