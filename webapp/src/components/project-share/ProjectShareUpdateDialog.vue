<template>
  <ProjectShareBaseDialog
    ref="dialog"
    :initialShare="share"
    :projectId="share.projectId"
    :defaultName="share.name"
    :title="title"
    :items="share.items!"
    :actionLabel="'Save'"
    :action="updateProjectShare"
    @done="$emit('update', $event)"
  />
</template>
<script lang="ts" setup>
import { ref } from "vue";
import type { ProjectShare } from "@quickbyte/common";
import { pluralize } from "@/core";
import ProjectShareBaseDialog from "./ProjectShareBaseDialog.vue";
import { computed } from "vue";
import type { ProjectShareActionArgs } from "./project-share-args";
import { trpcClient } from "@/app-utils";

const props = defineProps<{
  share: ProjectShare
}>();

defineEmits<{
  (e: 'update', share: ProjectShare): unknown;
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

async function updateProjectShare(args: ProjectShareActionArgs) {
  const result = await trpcClient.updateProjectShare.mutate({
    projectId: props.share.projectId,
    shareId: props.share._id,
    name: args.name,
    public: args.public,
    recipients: args.recipients,
    hasPassword: args.hasPassword,
    password: args.password,
    allowComments: args.allowComments,
    allowDownload: args.allowDownload,
    showAllVersions: args.showAllVersions,
    expiresAt: args.expiresAt
  });

  return result;
}
</script>