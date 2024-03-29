<template>
  <MediaCardItem
    v-if="item.type === 'media'"
    :media="item.item"
    :selected="selected"
    :showSelectCheckbox="showSelectCheckbox"
    @update="$emit('update', { type: 'media', item: $event })"
    @delete="$emit('delete', { type: 'media', itemId: $event })"
    @move="$emit('move', { type: 'media', itemId: item._id })"
    @toggleSelect="$emit('toggleSelect', { type: 'media', itemId: item._id })"
    @toggleInMultiSelect="$emit('toggleInMultiSelect', { type: 'media', itemId: item._id })"
  />
  <ProjectFolderItemCard
    v-if="item.type === 'folder'"
    :folder="item.item"
    :selected="selected"
    :showSelectCheckbox="showSelectCheckbox"
    @update="$emit('update', { type: 'folder', item: $event })"
    @delete="$emit('delete', { type: 'folder', itemId: $event })"
    @move="$emit('move', { type: 'folder', itemId: item._id })"
    @toggleSelect="$emit('toggleSelect', { type: 'folder', itemId: item._id })"
    @toggleInMultiSelect="$emit('toggleInMultiSelect', { type: 'folder', itemId: item._id })"
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

type ItemDescriptor = {
  type: ProjectItemType,
  itemId: string;
}

defineProps<{
  item: ProjectItem,
  selected?: boolean,
  showSelectCheckbox?: boolean,
}>();

defineEmits<{
  (e: 'update', args: UpdatedItemEvent): unknown;
  (e: 'delete', args: ItemDescriptor): unknown;
  (e: 'move', args: ItemDescriptor): unknown;
  (e: 'toggleSelect', args: ItemDescriptor): unknown;
  (e: 'toggleInMultiSelect', args: ItemDescriptor): unknown;
}>();
</script>