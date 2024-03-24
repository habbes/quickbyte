<template>
  <MediaCardItem
    v-if="item.type === 'media'"
    :media="item.item" 
    @update="$emit('update', { type: 'media', item: $event })"
    @delete="$emit('delete', { type: 'media', itemId: $event })"
    @move="moveItem()"
  />
  <ProjectFolderItemCard
    v-if="item.type === 'folder'"
    :folder="item.item"
    @update="$emit('update', { type: 'folder', item: $event })"
    @delete="$emit('delete', { type: 'folder', itemId: $event })"
    @move="moveItem()"
  />
  <MoveProjectItemDialog
    ref="moveDialog"
    :projectId="item.item.projectId"
    :item="item"
  />
</template>
<script lang="ts" setup>
import type { Folder, Media, ProjectItem, ProjectItemType } from "@quickbyte/common";
import MediaCardItem from "./MediaCardItem.vue";
import ProjectFolderItemCard from "./ProjectFolderItemCard.vue";
import MoveProjectItemDialog from "./MoveProjectItemDialog.vue";
import { ref } from "vue";

type UpdatedItemEvent = {
  type: 'media',
  item: Media
} | {
  type: 'folder',
  item: Folder
};

type DeletedItemEvent = {
  type: ProjectItemType,
  itemId: string;
}

defineProps<{
  item: ProjectItem
}>();

defineEmits<{
  (e: 'update', args: UpdatedItemEvent): unknown;
  (e: 'delete', args: DeletedItemEvent): unknown;
}>();

const moveDialog = ref<typeof MoveProjectItemDialog>();

function moveItem() {
  moveDialog.value?.open();
}
</script>