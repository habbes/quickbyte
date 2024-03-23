<template>
  <MediaCardItem
    v-if="item.type === 'media'"
    :media="item.item" 
    @update="$emit('update', { type: 'media', item: $event })"
    @delete="$emit('delete', { type: 'media', itemId: $event })"
  />
  <ProjectFolderItemCard
    v-if="item.type === 'folder'"
    :folder="item.item"
    @update="$emit('update', { type: 'folder', item: $event })"
    @delete="$emit('delete', { type: 'folder', itemId: $event })"
  />
</template>
<script lang="ts" setup>
import type { Folder, Media, ProjectItem, ProjectItemType } from "@quickbyte/common";
import MediaCardItem from "./MediaCardItem.vue";
import ProjectFolderItemCard from "./ProjectFolderItemCard.vue";

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
</script>