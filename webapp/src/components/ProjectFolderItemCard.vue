<template>
  <ProjectItemCardBase
    :id="folder._id"
    :name="folder.name"
    :link="{ name: 'project-media', params: { projectId: folder.projectId } }"
    @rename="renameFolder()"
  >
    <FolderIcon class="h-10 w-10" />
    <template #title>
      {{ folder.name  }}
    </template>
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
  folder: Folder
}>();

defineEmits<{
  (e: 'update', updatedFolder: Folder): void;
}>();

const renameDialog = ref<typeof RenameFolderDialog>();

function renameFolder() {
  renameDialog.value?.open();
}

</script>