<template>
  <ProjectItemCardBase
    :id="folder._id"
    :name="folder.name"
    :link="{ name: 'project-share', params: { shareId, code: shareCode, folderId: folder._id } }"
    :selected="selected"
    :showSelectCheckbox="showSelectCheckbox"
    :totalSelectedItems="totalSelectedItems"
    @toggleSelect="$emit('toggleSelect')"
    @toggleInMultiSelect="$emit('toggleInMultiSelect')"
    @selectAll="$emit('selectAll')"
    @unselectAll="$emit('unselectAll')"
  >
    <FolderIcon class="h-10 w-10" />
    <template #extraDetails>
    </template>
    <template #menuItems>
      <ProjectShareItemMenuItems
        :totalSelectedItems="totalSelectedItems"
      />
    </template>
  </ProjectItemCardBase>
</template>
<script lang="ts" setup>
import type { Folder } from "@quickbyte/common";
import ProjectItemCardBase from '@/components/ProjectItemCardBase.vue';
import { FolderIcon } from '@heroicons/vue/24/solid';
import ProjectShareItemMenuItems from "./ProjectShareItemMenuItems.vue";

const props = defineProps<{
  folder: Folder;
  shareId: string;
  shareCode: string;
  selected?: boolean,
  showSelectCheckbox?: boolean;
  totalSelectedItems?: number;
}>();

defineEmits<{
  (e: 'download'): void;
  (e: 'toggleSelect'): void;
  (e: 'toggleInMultiSelect'): void;
  (e: 'selectAll'): void;
  (e: 'unselectAll'): void;
}>();
</script>