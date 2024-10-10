<template>
  <div class="flex-1 flex flex-col h-full">
    <!-- <div class="px-2 py-2">{{ project.name }}</div> -->

    <div class="flex px-2 justify-between items-center border-b-[0.5px] border-b-gray-700 h-12">
      <div class="flex items-center gap-2">
        <div class="text-sm cursor-pointer" @click="openRootFolder()">
          {{ project.name }}
        </div>
        <div
          v-for="pathItem in currentPath"
          :key="pathItem._id"
          class="flex items-center gap-1"
        >
          <Icon icon="lucide:chevron-right" />
          <div
            class="text-sm cursor-pointer text-gray-200 hover:text-white"
            @click="openFolder(pathItem._id)"
          >
            {{ pathItem.name }}
          </div>
        </div>
      </div>
      <div class="flex gap-2 w-[200px]">
        <!-- <button type="button"
            class="flex-1 text-sm text-gray-200 border border-black active:bg-[#1f141b] hover:bg-[#31202b] rounded-md inline-flex justify-center items-center px-2 py-1"
          >Download</button>
          <button type="button"
            class="flex-1 text-sm text-gray-200 border border-black active:bg-[#1f141b] hover:bg-[#31202b] rounded-md inline-flex justify-center items-center px-2 py-1"
          >Upload</button> -->
        <UiButton @click="uploadToProject()" class="flex-1" sm>Upload</UiButton>
        <UiButton class="flex-1" sm>Download</UiButton>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-2 py-2">
      <div v-if="itemsQueryPending" class="flex w-full h-full items-center justify-center">
        <LoadingSpinner />
      </div>
      <div
        v-else-if="items.length"
        class="flex flexr-row"
      >
        <div class="flex-1 grid gap-4 grid-cols-[repeat(auto-fill,minmax(100px,1fr))]">
          <div
            v-for="item in items"
            :key="item._id"
            @click="onItemClick(item)"
            class="w-full aspect-square flex flex-col gap-2 cursor-pointer"
          >
            <div class="flex justify-center">
              <div v-if="item.type === 'media' && item.item.thumbnailUrl">
                <img :src="item.item.thumbnailUrl" class="img h-[50px] " />
              </div>
              <ProjectItemIcon v-else :item="item" class="text-5xl text-gray-400" />
            </div>
            <div :title="item.name"
              class="text-xs text-center text-ellipsis whitespace-nowrap overflow-hidden"
            >
              {{ item.name }}
            </div>
          </div>
        </div>
        <ProjectSidebar v-if="sidebarOpen" class="w-80" />
      </div>
      <div v-else class="text-sm text-gray-200 h-full w-full flex justify-center items-center">
        No items found in this folder.
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { watch, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { trpcClient, useProjectItemsQuery, store } from "@/app-utils";
import { UiButton } from "@/components/ui";
import { ensure, isDefined, type Project, type ProjectItem } from "@quickbyte/common";
import { open } from "@tauri-apps/api/dialog";
import ProjectItemIcon from '@/components/ProjectItemIcon.vue';
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import ProjectSidebar from "@/components/ProjectSidebar.vue";
import { uploadFiles, getFileSizes, findCommonBasePath, type UploadFilesRequest } from "@/core";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  project: Project
}>();

const router = useRouter();

const projectId = computed(() => props.project._id);
const currentFolderId = ref<string>();

const itemsQuery = useProjectItemsQuery(projectId, currentFolderId);
const itemsQueryPending = computed(() => itemsQuery.isPending.value);
const items = computed(() => itemsQuery.data.value ? itemsQuery.data.value.items : []);
const currentFolder = computed(() => itemsQuery.data.value?.folder);
const currentPath = computed(() => currentFolder.value?.path || []);
const selectedItems = ref<Set<string>>(new Set());
const sidebarOpen = computed(() => selectedItems.value.size > 0);

watch(() => props.project, () => {
  console.log('project id changed to', props.project);
  // await fetchProjects()
  // reset selected folder
  currentFolderId.value = undefined;
}, { immediate: true });

function openFolder(folderId: string|undefined) {
  currentFolderId.value = folderId;
}

function openRootFolder() {
  openFolder(undefined);
}

function onItemClick(item: ProjectItem) {
  if (item.type === 'folder') {
    openFolder(item._id);
  }
}

async function uploadToProject() {
  // Open a selection dialog for directories
  const selected = await open({
    multiple: true,
    recursive: true,
  });

  if (!isDefined(selected)) {
    return;
  }

  const files = await getFileSizes(Array.isArray(selected) ? selected : [selected!]);

  const result = await trpcClient.uploadProjectMedia.mutate({
    projectId: props.project._id,
    folderId: currentFolderId.value,
    provider: store.preferredProvider.value.provider,
    region: ensure(store.preferredProvider.value.bestRegions[0], "Could not retrieve best region"),
    files: files.map(f => ({
      name: f.name,
      size: f.size
    }))
  });

  const request: UploadFilesRequest = {
    transferId: result.transfer._id,
    name: result.transfer.name,
    localPath: findCommonBasePath(files.map(f => f.path)),
    files: result.transfer.files.map(f => {
      const matchedFile = files.find(meta => meta.name === f.name)!;
      return {
        localPath: matchedFile.path,
        transferFile: f
      }
    })
  };

  await uploadFiles(request);
  router.push({ name: 'transfers' });
}
</script>