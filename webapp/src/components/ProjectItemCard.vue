<template>
  <MediaCardItem
    v-if="item.type === 'media'"
    :media="item.item"
    :selected="selected"
    @update="$emit('update', { type: 'media', item: $event })"
    @delete="$emit('delete', { type: 'media', itemId: $event })"
    @move="moveItem()"
    @toggleSelect="$emit('toggleSelect', item._id)"
  />
  <ProjectFolderItemCard
    v-if="item.type === 'folder'"
    :folder="item.item"
    :selected="selected"
    @update="$emit('update', { type: 'folder', item: $event })"
    @delete="$emit('delete', { type: 'folder', itemId: $event })"
    @move="moveItem()"
    @toggleSelect="$emit('toggleSelect', item._id)"
  />
  <MoveProjectItemDialog
    ref="moveDialog"
    :projectId="item.item.projectId"
    :item="item"
    @move="$emit('move', $event)"
    
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
  item: ProjectItem,
  selected?: boolean,
}>();

defineEmits<{
  (e: 'update', args: UpdatedItemEvent): unknown;
  (e: 'delete', args: DeletedItemEvent): unknown;
  (e: 'move', movedItem: ProjectItem): unknown;
  (e: 'toggleSelect', itemId: string): unknown;
}>();

const moveDialog = ref<typeof MoveProjectItemDialog>();

function moveItem() {
  moveDialog.value?.open();
}
</script>