<template>
  <div v-if="!project" class="flex flex-1 justify-center items-center h-full">
    <div  class="text-sm px-4 py-2 text-center text-gray-200">
      No project selected. Select a project on the left panel to view files and folders.
    </div>
  </div>
  <div v-else class="flex-1 flex flex-col h-full">
    <!-- <div class="px-2 py-2">{{ project.name }}</div> -->
    
    <div class="flex px-2 justify-between items-center border-b-[0.5px] border-b-gray-700 h-12">
      <div class="text-sm">
        {{ project.name }}
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
      <TreeRoot
        v-slot="{ flattenItems }"
        class="list-none select-none rounded-lg p-2 text-sm font-medium"
        :items="treeItems"
        :get-key="(item) => item._id"
        v-model="selectedTreeItem"
      >
        <TreeItem
          v-for="item in flattenItems"
          v-slot="{ isExpanded }"
          :key="item._id"
          :style="{ 'padding-left': `${item.level - 0.5}rem` }"
          v-bind="item.bind"
          class="flex items-center py-1 px-2 my-0.5 rounded outline-none focus:ring-grass8 focus:ring-2 data-[selected]:bg-grass4"
        >
          <template v-if="item.hasChildren">
            <Icon
              v-if="!isExpanded"
              icon="lucide:folder"
              class="h-4 w-4"
            />
            <Icon
              v-else
              icon="lucide:folder-open"
              class="h-4 w-4"
            />
          </template>
          <Icon
            v-else
            :icon="item.value.icon || 'lucide:file'"
            class="h-4 w-4"
          />
          <div class="pl-2">
            {{ item.value.title }}
          </div>
        </TreeItem>
      </TreeRoot>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { watch, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { store, trpcClient } from "@/app-utils";
import { UiButton } from "@/components/ui";
import { isDefined } from "@quickbyte/common";
import type { GetProjectItemsResult } from "@quickbyte/common";
import { message, open } from "@tauri-apps/api/dialog";
import { TreeItem, TreeRoot } from 'radix-vue'
import { Icon } from '@iconify/vue'
import { uploadFiles, getFileSizes, findCommonBasePath, type UploadFilesRequest } from "@/core";

type TreeEntry = {
  _id: string;
  title: string;
  icon: string;
  type: 'folder' | 'media';
  children: TreeEntry[];
};

const router = useRouter();

const project = store.currentProject;
const items = ref<GetProjectItemsResult>();
const selectedTreeItem = ref<TreeEntry>();

const treeItems = computed<TreeEntry[]>(() => {
  if (!items.value) return [] as TreeEntry[];
  return items.value.items.map((item) => {
    return {
      _id: item._id,
      title: item.name,
      icon: item.type === 'folder' ? 'lucide:folder' : 'lucide:file',
      type: item.type,
      children: [] as TreeEntry[]
    };
  });
});

// TODO: use a different hook, maybe onBeforeRouteEnter
watch(() => store.user, () => {
  if (!store.user.value) {
    router.push({ name: "login" });
  }
}, { immediate: true });

watch(store.selectedProjectId, async () => {
  console.log('project id changed to', store.selectedProjectId.value)
  await fetchProjects()
});

async function fetchProjects() {
  try {
    console.log('fetching...');
    if (!project.value) {
      return;
    }

    items.value = await trpcClient.getProjectItems.query({ projectId: project.value._id });
    console.log('items', items.value);
  }
  catch (e: any) {
    await message(`Error: ${e}`, { type: 'error' });
  }
}

async function uploadToProject() {
  if (!store.selectedProjectId.value) {
    return;
  }
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
    projectId: store.selectedProjectId.value,
    folderId: selectedTreeItem.value && selectedTreeItem.value.type === 'folder' ? selectedTreeItem.value._id : undefined,
    provider: 'az',
    region: 'northsa',
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