<template>
  <UiDialog
    ref="dialog"
    :title="`Move ${item.name} to...`"
  >
    <UiLayout gapSm>
      <UiTextInput
        v-model="searchTerm"
        placeholder="Search folders to move to"
        fullWidth
      />
      <div class="h-[200px]">
        <UiLayout verticalScroll class="h-full">
          <UiLayout v-if="!loading && !searchTerm" class="text-gray-500">
            Search for a folder to move the item to.
          </UiLayout>
          <UiLayout v-else-if="!loading" gapSm>
            <UiLayout
              v-for="folder in folders"
              :key="folder._id"
              class="p-2 cursor-pointer"
              :class="{
                'bg-slate-100 rounded-md': selectedFolderId === folder._id
              }"
              @click="selectedFolderId = folder._id"
            >
              <UiLayout horizontal gapSm class="text-xs text-gray-700">
                <FolderIcon class="h-4 w-4" />
                {{ folder.name }}
              </UiLayout>
              <UiLayout>
                <span class="text-xs truncate text-gray-400">
                  {{ getFolderPath(folder) }}
                </span>
              </UiLayout>
            </UiLayout>
          </UiLayout>
          <UiLayout v-else>
            Searching...
          </UiLayout>
        </UiLayout>
      </div>
    </UiLayout>
    <template #actions>
      <UiLayout horizontal justifyEnd gapSm>
        <UiButton
          @click="close()"
        >
          Cancel
        </UiButton>
        <UiButton
          primary
          :disabled="!selectedFolderId"
          @click="moveItem()"
        >
          Move
        </UiButton>
      </UiLayout>
    </template>
  </UiDialog>
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";
import { UiDialog, UiLayout, UiTextInput, UiButton } from "@/components/ui";
import { showToast, trpcClient, wrapError } from "@/app-utils";
import type { Folder, FolderWithPath, ProjectItem } from "@quickbyte/common";
import { FolderIcon } from "@heroicons/vue/24/solid";

const props = defineProps<{
  projectId: string,
  item: ProjectItem
}>();

defineExpose({ open, close });

const emit = defineEmits<{
  (e: 'move', movedItem: ProjectItem): unknown;
}>();

const dialog = ref<typeof UiDialog>();
const folders = ref<FolderWithPath[]>([]);
const selectedFolderId = ref<string>();
const searchTerm = ref("");
const loading = ref(false);

// TODO: debounce/throttle this
watch(searchTerm, async () => {
  await searchFolders();
});

function searchFolders() {
  return wrapError(async () => {
    if (!searchTerm.value) {
      return;
    }

    loading.value = true;
    folders.value = await trpcClient.searchProjectFolders.query({
      projectId: props.projectId,
      searchTerm: searchTerm.value
    });
  }, {
    finally: () => loading.value = false
  });
}

function getFolderPath(folder: FolderWithPath) {
  return folder.path.map(m => m.name).join("/");
}

function open() {
  searchTerm.value = "";
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}

function moveItem() {
  return wrapError(async () => {
    if (!selectedFolderId.value) {
      return;
    }

    const targetFolder = folders.value.find(f => f._id === selectedFolderId.value);

    if (props.item.type === 'folder') {
      const movedFolder = await trpcClient.moveFolderToFolder.mutate({
        projectId: props.item.item.projectId,
        folderId: props.item.item._id,
        targetFolderId: selectedFolderId.value
      });

      const updatedItem: ProjectItem = {
        _id: movedFolder._id,
        type: 'folder',
        name: movedFolder.name,
        item: movedFolder,
        _createdAt: movedFolder._createdAt,
        _updatedAt: movedFolder._updatedAt
      };

      emit('move', updatedItem);
    }
    else if (props.item.type === 'media') {
      const movedMedia = await trpcClient.moveMediaToFolder.mutate({
        projectId: props.item.item.projectId,
        mediaId: props.item.item._id,
        targetFolderId: selectedFolderId.value
      });

      const updatedItem: ProjectItem = {
        _id: movedMedia._id,
        type: 'media',
        name: movedMedia.name,
        item: movedMedia,
        _createdAt: movedMedia._createdAt,
        _updatedAt: movedMedia._updatedAt
      };

      emit('move', updatedItem);
    }

    
    showToast(targetFolder ? `Successfully moved '${props.item.name}' to '${targetFolder.name}''.` : `Successfully moved '${props.item.name}' to target folder.`, 'info');
  });
}
</script>