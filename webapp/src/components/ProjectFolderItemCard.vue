<template>
  <ProjectItemCardBase
    :id="folder._id"
    :name="folder.name"
    :link="{ name: 'project-media', params: { projectId: folder.projectId, folderId: folder._id } }"
    @rename="renameFolder()"
    @delete="deleteFolder()"
    @move="$emit('move')"
  >
    <FolderIcon class="h-10 w-10" />
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
   <DeleteFolderDialog
    ref="deleteDialog"
    :folder="folder"
    @delete="$emit('delete', $event)"
  ></DeleteFolderDialog>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import type { Folder } from "@quickbyte/common";
import ProjectItemCardBase from './ProjectItemCardBase.vue';
import RenameFolderDialog from "./RenameFolderDialog.vue";
import DeleteFolderDialog from "./DeleteFolderDialog.vue";
import { FolderIcon } from '@heroicons/vue/24/solid';

const props = defineProps<{
  folder: Folder
}>();

defineEmits<{
  (e: 'update', updatedFolder: Folder): void;
  (e: 'delete', deletedFolderId: string): void;
  (e: 'move'): void;
}>();

const renameDialog = ref<typeof RenameFolderDialog>();
const deleteDialog = ref<typeof DeleteFolderDialog>();

function renameFolder() {
  renameDialog.value?.open();
}

function deleteFolder() {
  deleteDialog.value?.open();
}
</script>