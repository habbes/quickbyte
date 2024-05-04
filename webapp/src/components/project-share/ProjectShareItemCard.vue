<template>
  <ProjectShareMediaItemCard
    v-if="item.type === 'media'"
    :media="item.item"
    :shareId="shareId"
    :shareCode="shareCode"
    :selected="selected"
    :showSelectCheckbox="showSelectCheckbox"
    :totalSelectedItems="totalSelectedItems"
    :allowDownload="allowDownload"
    :showAllVersions="showAllVersions"
    @download="$emit('download', { type: 'media', _id: item._id })"
    @toggleSelect="$emit('toggleSelect', { type: 'media', itemId: item._id })"
    @toggleInMultiSelect="$emit('toggleInMultiSelect', { type: 'media', itemId: item._id })"
    @selectAll="$emit('selectAll')"
    @unselectAll="$emit('unselectAll')"
  />
  <ProjectShareFolderItemCard
    v-if="item.type === 'folder'"
    :folder="item.item"
    :shareId="shareId"
    :shareCode="shareCode"
    :selected="selected"
    :showSelectCheckbox="showSelectCheckbox"
    :totalSelectedItems="totalSelectedItems"
    @download="$emit('download', { type: 'folder', _id: item._id })"
    @toggleSelect="$emit('toggleSelect', { type: 'folder', itemId: item._id })"
    @toggleInMultiSelect="$emit('toggleInMultiSelect', { type: 'folder', itemId: item._id })"
    @selectAll="$emit('selectAll')"
    @unselectAll="$emit('unselectAll')"
  />
</template>
<script lang="ts" setup>
import type { ProjectItem, ProjectShareItemRef, ProjectItemType } from "@quickbyte/common";
import ProjectShareMediaItemCard from "./ProjectShareMediaItemCard.vue";
import ProjectShareFolderItemCard from "./ProjectShareFolderItemCard.vue";

type ItemDescriptor = {
  type: ProjectItemType,
  itemId: string;
}

defineProps<{
  item: ProjectItem;
  shareId: string;
  shareCode: string;
  selected?: boolean;
  showSelectCheckbox?: boolean;
  totalSelectedItems?: number;
  allowDownload: boolean;
  showAllVersions: boolean;
}>();

defineEmits<{
  (e: 'download', args: ProjectShareItemRef): unknown;
  (e: 'toggleSelect', args: ItemDescriptor): unknown;
  (e: 'toggleInMultiSelect', args: ItemDescriptor): unknown;
  (e: 'selectAll'): unknown;
  (e: 'unselectAll'): unknown;
}>();
</script>