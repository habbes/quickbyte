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
          <!-- <UiLayout v-if="!loading && !searchTerm" class="text-gray-500">
            Search for a folder to move the item to.
          </UiLayout> -->
          
          <UiLayout gapSm>
            <UiLayout
              class="p-2 cursor-pointer"
              :class="{
                'bg-slate-100 rounded-md': selectedRoot
              }"
              @click="selectRoot()"
            >
              <UiLayout horizontal gapSm class="text-xs text-gray-700">
                <HomeIcon class="h-4 w-4" />
                Project root
              </UiLayout>
              <UiLayout>
                <span class="text-xs truncate text-gray-400">
                  /
                </span>
              </UiLayout>
            </UiLayout>
            <UiLayout
              v-for="folder in folders"
              :key="folder._id"
              class="p-2 cursor-pointer"
              :class="{
                'bg-slate-100 rounded-md': selectedFolderId === folder._id
              }"
              @click="selectFolder(folder._id)"
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
          <UiLayout v-if="loading" class="text-xs">
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
          :disabled="!selectedFolderId && !selectedRoot"
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
import type { FolderWithPath, ProjectItem } from "@quickbyte/common";
import { FolderIcon, HomeIcon } from "@heroicons/vue/24/solid";
import { ensure } from "@/core";

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
const selectedRoot = ref(false);
const searchTerm = ref("");
const loading = ref(false);

function selectFolder(folderId: string) {
  selectedFolderId.value = folderId;
  selectedRoot.value = false;
}

function selectRoot() {
  selectedFolderId.value = undefined;
  selectedRoot.value = true;
}

// TODO: debounce/throttle this
watch(searchTerm, async () => {
  await searchFolders();
});

function searchFolders() {
  return wrapError(async () => {
    if (!searchTerm.value) {
      folders.value = [];
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
  return `/${folder.path.map(m => m.name).join("/")}`;
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
    if (!selectedFolderId.value && !selectedRoot.value) {
      return;
    }

    const targetFolder = selectedRoot.value ? null : folders.value.find(f => f._id === selectedFolderId.value);
  
    if (props.item.type === 'folder') {
      const movedFolder = await trpcClient.moveFolderToFolder.mutate({
        projectId: props.item.item.projectId,
        folderId: props.item.item._id,
        targetFolderId: selectedRoot.value ? null : ensure(selectedFolderId.value)
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
        targetFolderId: selectedRoot.value ? null : ensure(selectedFolderId.value)
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

    showToast(targetFolder ? `Successfully moved '${props.item.name}' to '${targetFolder.name}''.` : `Successfully moved '${props.item.name}' to project root.`, 'info');
  });
}
</script>