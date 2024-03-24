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
        <UiButton primary :disabled="!selectedFolderId">
          Move
        </UiButton>
      </UiLayout>
    </template>
  </UiDialog>
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";
import { UiDialog, UiLayout, UiTextInput, UiButton } from "@/components/ui";
import { trpcClient, wrapError } from "@/app-utils";
import type { Folder, FolderWithPath, ProjectItem } from "@quickbyte/common";
import { FolderIcon } from "@heroicons/vue/24/solid";

const props = defineProps<{
  projectId: string,
  item: ProjectItem
}>();

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();
const folders = ref<FolderWithPath[]>([]);
const selectedFolderId = ref<string>();
const searchTerm = ref("");
const loading = ref(false);

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

    console.log('folders', folders.value);
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
</script>