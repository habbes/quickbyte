<template>
  <ProjectShareBaseDialog
    ref="dialog"
    :projectId="project._id"
    :defaultName="defaultName"
    :items="items"
    :title="title"
    :actionLabel="'Share'"
    :action="createProjectShare"
  />
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";
import ProjectShareBaseDialog from "./ProjectShareBaseDialog.vue";
import { pluralize } from "@/core";
import type { ProjectItem, Project } from "@quickbyte/common";
import { trpcClient } from "@/app-utils";
import type { ProjectShareActionArgs } from "./project-share-args";

const props = defineProps<{
  project: Project;
  items: ProjectItem[]
}>();

defineExpose({ open, close });

const dialog = ref<typeof ProjectShareBaseDialog>();

const title = computed(() =>
  `Share ${props.items.length} ${pluralize('item', props.items.length)}`
);

const defaultName = computed(() =>
  props.items.length === 1 ?
    props.items[0].name : 
    `${props.project.name} Review - ${new Date().toLocaleDateString()}`
);

const items = computed(() =>
  props.items.map(item => ({ _id: item._id, type: item.type }))
);


function open() {
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}

async function createProjectShare(args: ProjectShareActionArgs) {
  const result = await trpcClient.createProjectShare.mutate({
    projectId: props.project._id,
    name: args.name,
    expiresAt: args.expiresAt,
    allowDownload: args.allowDownload,
    allowComments: args.allowComments,
    showAllVersions: args.showAllVersions,
    items: args.items,
    password: args.password,
    public: args.public,
    recipients: args.recipients
  });

  return result;
}
</script>
