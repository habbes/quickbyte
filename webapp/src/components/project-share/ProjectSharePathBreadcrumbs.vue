<template>
  <FolderPathBreadcrumbsVue
    :path="path"
    :getFolderLink="getFolderLink"
  />
</template>
<script lang="ts" setup>
import type { FolderPathEntry } from "@quickbyte/common";
import FolderPathBreadcrumbsVue from "@/components/FolderPathBreadcrumbs.vue";

const props = defineProps<{
  shareId: string;
  shareCode: string;
  path: FolderPathEntry[]
}>();

function getFolderLink(folderId: string) {
  return {
    name: 'project-share',
    params: {
      shareId: props.shareId,
      code: props.shareCode,
      folderId: folderId
    }
  };
}
</script>