<template>
  <ProjectItemCardBase
    :id="folder._id"
    :name="folder.name"
    :link="{ name: 'project-media', params: { projectId: folder.projectId, folderId: folder._id } }"
    :selected="selected"
    :showSelectCheckbox="showSelectCheckbox"
    :totalSelectedItems="totalSelectedItems"
    @rename="renameFolder()"
    @delete="$emit('delete', folder._id)"
    @move="$emit('move')"
    @share="$emit('share')"
    @toggleSelect="$emit('toggleSelect')"
    @toggleInMultiSelect="$emit('toggleInMultiSelect')"
    @selectAll="$emit('selectAll')"
    @unselectAll="$emit('unselectAll')"
  >
    <FolderIcon class="h-10 w-10 text-[#ccd1e7]" />
    <template #extraDetails>
      <div>
        {{ folder._createdAt.toLocaleDateString() }}
      </div>
    </template>
  </ProjectItemCardBase>
  <RenameFolderDialog
    ref="renameDialog"
    :folder="folder"
    @rename="$emit('update', $event)"
   />
</template>
<script lang="ts" setup>
import { ref } from "vue";
import type { Folder } from "@quickbyte/common";
import ProjectItemCardBase from './ProjectItemCardBase.vue';
import RenameFolderDialog from "./RenameFolderDialog.vue";
import { FolderIcon } from '@heroicons/vue/24/solid';

const props = defineProps<{
  folder: Folder,
  selected?: boolean,
  showSelectCheckbox?: boolean;
  totalSelectedItems?: number;
}>();

defineEmits<{
  (e: 'update', updatedFolder: Folder): void;
  (e: 'delete', deletedFolderId: string): void;
  (e: 'move'): void;
  (e: 'share'): void;
  (e: 'toggleSelect'): void;
  (e: 'toggleInMultiSelect'): void;
  (e: 'selectAll'): void;
  (e: 'unselectAll'): void;
}>();

const renameDialog = ref<typeof RenameFolderDialog>();

function renameFolder() {
  renameDialog.value?.open();
}
</script>