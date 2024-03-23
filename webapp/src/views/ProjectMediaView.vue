<template>
  <UiLayout fill>
    <UiLayout
      horizontal
      innerSpace
      gapSm
      itemsCenter
      justifyBetween
      :fixedHeight="`${headerHeight}px`"
    >
      <UiLayout fill>
        <UiSearchInput v-model="searchTerm" placeholder="Search files" />
      </UiLayout>
      <RequireRole v-if="project" :accepted="['admin', 'owner', 'editor']" :current="project.role">
        <UiLayout title="Add items">
          <UiMenu>
            <template #trigger>
              <UiButton
                title="Add new items to the project"
                primary
                lg
              >
              <PlusIcon class="h-5 w-5" /><span class="hidden sm:inline">New</span>
            </UiButton>
            
            </template>
            <UiMenuItem @click="openFilePicker()">
              <UiLayout horizontal itemsCenter gapSm>
                <DocumentArrowUpIcon class="h-5 w-5" /> Upload files
              </UiLayout>
            </UiMenuItem>
            <UiMenuItem>
              <UiLayout horizontal itemsCenter gapSm>
                <CloudArrowUpIcon class="h-5 w-5" /> Upload folders
              </UiLayout>
            </UiMenuItem>
            <UiMenuItem @click="createFolder()">
              <UiLayout horizontal itemsCenter gapSm>
                <FolderPlusIcon class="h-5 w-5" /> New folder
              </UiLayout>
            </UiMenuItem>
          </UiMenu>
        </UiLayout>
        
      </RequireRole>
      <UiLayout title="Sort items">
        <UiMenu>
          <template #trigger>
            <UiLayout :fixedHeight="`${headerHeight}px`">
              <ArrowsUpDownIcon class="h-full w-7  cursor-pointer" />
            </UiLayout>
            
          </template>
          <div v-if="queryOptions?.sortBy && selectedSortField">
            <UiMenuLabel>Order</UiMenuLabel>
            <UiMenuItem @click="selectSortField(selectedSortField.field, 'asc')">
              <UiLayout fullWidth horizontal justifyBetween itemsCenter>
                <UiLayout :class="{ 'font-bold': queryOptions.sortBy.direction === 'asc' }">
                  {{ selectedSortField.ascName }}
                </UiLayout>
                <UiLayout v-if="queryOptions.sortBy.direction === 'asc'">
                  <CheckIcon class="w-4 h-4"/>
                </UiLayout>
              </UiLayout>
            </UiMenuItem>
            <UiMenuItem @click="selectSortField(selectedSortField.field, 'desc')">
              <UiLayout horizontal justifyBetween itemsCenter>
                <UiLayout :class="{ 'font-bold': queryOptions.sortBy.direction === 'desc' }">
                  {{ selectedSortField.descName }}
                </UiLayout>
                <UiLayout v-if="queryOptions.sortBy.direction === 'desc'">
                  <CheckIcon class="w-4 h-4"/>
                </UiLayout>
              </UiLayout>
            </UiMenuItem>
          </div>
          <div>
            <UiMenuLabel>Sort by</UiMenuLabel>
            <UiMenuItem
              v-for="field in sortFields"
              :key="field.field"
              @click="selectSortField(field.field)"
            >
              <UiLayout fullWidth horizontal justifyBetween itemsCenter>
                <UiLayout :class="{ 'font-bold': queryOptions?.sortBy?.field === field.field }">
                  {{ field.displayName }}
                </UiLayout>
                <UiLayout v-if="field.field === queryOptions?.sortBy?.field">
                  <CheckIcon class="w-4 h-4" />
                </UiLayout>
              </UiLayout>
            </UiMenuItem>
          </div>
        </UiMenu>
        
      </UiLayout>
      
    </UiLayout>
    <UiLayout ref="dropzone" v-if="!loading" innerSpace fill verticalScroll :fixedHeight="contentHeight" class="fixed" fullWidth
      :style="{ top: `${contentOffset}px`, height: contentHeight, position: 'fixed', 'overflow-y': 'auto'}"
    >
      <div v-if="isOverDropZone" class="absolute w-full h-full flex items-center justify-center">
        
        <div class="text-white text-lg flex flex-col items-center justify-center z-10">
          <div>
            <ArrowUpCircleIcon class=" h-12 w-12" />
          </div>
          <div>
            Drop files to upload
          </div>
        </div>
        <div class="absolute w-full h-full bg-black opacity-75"></div>
      </div>
      <div v-if="items.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2">
        <div class="text-center">
          You have no media in this {{ currentFolder ? 'folder' : 'project' }}. Upload some files using the button below.
        </div>

        <UiButton @click="openFilePicker()" primary lg>Upload Files</UiButton>
      </div>
      <div
        v-else
        class="grid grid-cols-2 gap-2 overflow-y-auto sm:gap-4 sm:grid-cols-3 lg:w-full lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]"
        
      >
        <div
          v-for="item in filteredItems"
          :key="item._id"
          class="w-full aspect-square"
        >
          <ProjectItemCard
            :item="item"
            @update="handleItemUpdate($event)"
            @delete="handleItemDelete($event)"
          />
        </div>
      </div>
    </UiLayout>
  </UiLayout>
  <CreateFolderDialog
    v-if="project"
    ref="createFolderDialog"
    @createFolder="handleCreatedFolder($event)"
    :projectId="project._id"
    :parentId="currentFolder?._id"
  />
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router';
import { showToast, store, logger, useFilePicker, useFileTransfer, trpcClient } from '@/app-utils';
import { ensure, pluralize, type Media } from '@/core';
import type { WithRole, Project, ProjectItem, Folder, ProjectItemType, ProjectFolderItem, FolderWithPath } from "@quickbyte/common";
import { PlusIcon, ArrowUpCircleIcon, ArrowsUpDownIcon, CheckIcon, FolderPlusIcon, DocumentArrowUpIcon, CloudArrowUpIcon } from '@heroicons/vue/24/outline'
import ProjectItemCard from '@/components/ProjectItemCard.vue';
import RequireRole from '@/components/RequireRole.vue';
import CreateFolderDialog from "@/components/CreateFolderDialog.vue"
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import { UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator, UiLayout, UiButton } from "@/components/ui";
import { getRemainingContentHeightCss, layoutDimensions } from '@/styles/dimentions';
import { injectFolderPathSetter } from "./project-utils";

type SortDirection = 'asc' | 'desc';

type QueryOptions = {
  sortBy?: {
    field: string,
    direction: SortDirection
  }
};

const headerHeight = layoutDimensions.projectMediaHeaderHeight;
// tried different things to get the positioning to look right
const contentOffset = headerHeight + layoutDimensions.navBarHeight + layoutDimensions.projectHeaderHeight + 2;
const contentHeight = getRemainingContentHeightCss(
  contentOffset
);

const updateCurrentFolderPath = injectFolderPathSetter();
const route = useRoute();
const createFolderDialog = ref<typeof CreateFolderDialog>();
const loading = ref(true);
const searchTerm = ref('');
const sortFields = [
  {
    field: '_createdAt',
    displayName: 'Date Uploaded',
    ascName: 'Oldest first',
    descName: 'Newest first',
    compare: (a: ProjectItem, b: ProjectItem) => {
      return new Date(a._createdAt).getTime() - new Date(b._createdAt).getTime();
    }
  },
  {
    field: '_updatedAt',
    displayName: 'Date modified',
    ascName: 'Oldest first',
    descName: 'Newest first',
    compare: (a: ProjectItem, b: ProjectItem) => {
      return new Date(a._updatedAt).getTime() - new Date(b._updatedAt).getTime();
    }
  },
  {
    field: 'name',
    displayName: 'Name',
    ascName: 'A-Z',
    descName: 'Z-A',
    compare: (a: ProjectItem, b: ProjectItem) => {
      return a.name.localeCompare(b.name);
    }
  }
];
const queryOptions = ref<QueryOptions>();
const selectedSortField = computed(() => {
  if (!(queryOptions.value) || !(queryOptions.value.sortBy)) {
    return;
  }

  return sortFields.find(f => f.field === queryOptions.value!.sortBy!.field);
});

const project = ref<WithRole<Project>>();
const {
  openFilePicker,
  onFilesSelected,
  onError,
  reset,
  useDropZone
} = useFilePicker();

const dropzone = ref<HTMLDivElement>();
const { isOverDropZone } = useDropZone(dropzone);

const media = ref<Media[]>([]);
const items = ref<ProjectItem[]>([]);
const currentFolder = ref<FolderWithPath|undefined>();

const {
  media: newMedia,
  startTransfer
} = useFileTransfer();

// TODO upload project items instead of media
watch([newMedia], () => {
  if (newMedia.value?.length) {
    media.value = media.value.concat(newMedia.value);
  }
})

const filteredItems = computed(() => {
  if (!searchTerm.value && !queryOptions.value) return items.value;

  let result = [...items.value];
  if (searchTerm) {
    const regex = new RegExp(searchTerm.value, 'i');
    result = items.value.filter(m => regex.test(m.name));
  }
  if (selectedSortField.value) {
    if (queryOptions.value!.sortBy?.direction === 'asc') {
      result.sort(selectedSortField.value.compare);
    } else {
      result.sort((a, b) => -selectedSortField.value!.compare(a, b));
    }
  }

  return result;
});

onError((e) => {
  logger.error(e.message, e);
  showToast(e.message, 'error');
});

onFilesSelected(async (files, directories) => {
  // start transfer
  // resetting the file picker to clear the file list,
  // otherwise the same files will be re-uploaded on the next
  // file selection as well
  reset();
  showToast(`Uploading ${files.length} ${pluralize('file', files.length)}...`, 'info');

  await startTransfer({
    files: files,
    directories: directories,
    projectId: ensure(route.params.projectId) as string
  });
});

function handleItemUpdate(update: { type: 'folder', item: Folder } | { type: 'media', item: Media }) {
  // TODO: handle folder update
  const index = items.value.findIndex(m => m._id === update.item._id && m.type === update.type);
  if (index < 0) return;
  
  const original = items.value[index];

  items.value[index] = Object.assign(original, {
    name: update.item.name,
    _updatedAt: update.item._updatedAt,
    item: update.item
  });
}

function handleItemDelete(args: { type: ProjectItemType, itemId: string }) {
  const index = items.value.findIndex(m => m._id === args.itemId);
  if (index < 0) return;

  items.value.splice(index, 1);
}

function handleCreatedFolder(newFolder: Folder) {
  const item: ProjectFolderItem = {
    _id: newFolder._id,
    _createdAt: newFolder._createdAt,
    _updatedAt: newFolder._updatedAt,
    type: 'folder',
    name: newFolder.name,
    item: newFolder
  };

  items.value.push(item);
}

function selectSortField(field: string, direction?: SortDirection) {
  if (!queryOptions.value) {
    queryOptions.value = {};
  }

  queryOptions.value.sortBy = {
    field,
    direction: direction || 'asc'
  };
}

function createFolder() {
  createFolderDialog.value?.open();
}

async function loadData(to: RouteLocationNormalizedLoaded) {
  const projectId = ensure(to.params.projectId) as string;
  project.value = ensure(store.projects.value.find(p => p._id === projectId, `Expected project '${projectId}' to be in store on media page.`));
  const folderId = to.params.folderId as string || undefined;
  loading.value = true;

  try {
    const result = await trpcClient.getProjectItems.query({ projectId: project.value._id, folderId: folderId });
    items.value = result.items;
    currentFolder.value = result.folder;
    updateCurrentFolderPath && updateCurrentFolderPath(result.folder?.path || []);
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
    
  } finally {
    loading.value = false;
  }
}

watch(route, async () => await loadData(route), { immediate: true });
</script>