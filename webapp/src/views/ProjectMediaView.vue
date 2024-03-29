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
            <UiMenuItem v-if="directoryPickerSupported" @click="openDirectoryPicker()">
              <UiLayout horizontal itemsCenter gapSm>
                <CloudArrowUpIcon class="h-5 w-5" /> Upload folder
              </UiLayout>
            </UiMenuItem>
            <UiMenuItem @click="createFolder()">
              <UiLayout horizontal itemsCenter gapSm>
                <FolderPlusIcon class="h-5 w-5" /> Create folder
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
            :selected="isItemSelected(item._id)"
            :showSelectCheckbox="selectedItemIds.size > 0"
            :totalSelectedItems="selectedItemIds.size"
            @update="handleItemUpdate($event)"
            @delete="handleDeleteRequested($event)"
            @move="handleMoveRequested($event)"
            @toggleSelect="handleToggleSelect($event)"
            @toggleInMultiSelect="handleToggleInMultiSelect($event)"
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
  <DeleteProjectItemsDialog
    v-if="project"
    ref="deleteItemsDialog"
    :projectId="project._id"
    :items="selectedItems"
    @delete="handleItemsDeleted($event)"
  />
  <MoveProjectItemsDialog
    v-if="project"
    ref="moveItemsDialog"
    :projectId="project._id"
    :items="selectedItems"
    @move="handleItemsMoved($event)"
  />
</template>
<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router';
import { showToast, store, logger, useFilePicker, useFileTransfer, trpcClient } from '@/app-utils';
import { ensure, pluralize } from '@/core';
import type { WithRole, Project, ProjectItem, Folder, ProjectItemType, ProjectFolderItem, FolderWithPath, Media } from "@quickbyte/common";
import { PlusIcon, ArrowUpCircleIcon, ArrowsUpDownIcon, CheckIcon, FolderPlusIcon, DocumentArrowUpIcon, CloudArrowUpIcon } from '@heroicons/vue/24/outline'
import ProjectItemCard from '@/components/ProjectItemCard.vue';
import DeleteProjectItemsDialog from '@/components/DeleteProjectItemsDialog.vue';
import MoveProjectItemsDialog from '@/components/MoveProjectItemsDialog.vue';
import RequireRole from '@/components/RequireRole.vue';
import CreateFolderDialog from "@/components/CreateFolderDialog.vue"
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import { UiMenu, UiMenuItem, UiMenuLabel, UiLayout, UiButton } from "@/components/ui";
import { getRemainingContentHeightCss, layoutDimensions } from '@/styles/dimentions';
import { injectFolderPathSetter } from "./project-utils";

const headerHeight = layoutDimensions.projectMediaHeaderHeight;
// tried different things to get the positioning to look right
const contentOffset = headerHeight + layoutDimensions.navBarHeight + layoutDimensions.projectHeaderHeight + 2;
const contentHeight = getRemainingContentHeightCss(
  contentOffset
);

const updateCurrentFolderPath = injectFolderPathSetter();
const route = useRoute();
const createFolderDialog = ref<typeof CreateFolderDialog>();
const deleteItemsDialog = ref<typeof DeleteProjectItemsDialog>();
const moveItemsDialog = ref<typeof MoveProjectItemsDialog>();
const loading = ref(true);
const searchTerm = ref('');

const { sortFields, queryOptions, selectedSortField, selectSortField } = store.projectItemsQueryOptions;

const project = ref<WithRole<Project>>();
const {
  openFilePicker,
  directoryPickerSupported,
  openDirectoryPicker,
  onFilesSelected,
  onError,
  reset,
  useDropZone
} = useFilePicker();

const dropzone = ref<HTMLDivElement>();
const { isOverDropZone } = useDropZone(dropzone);

const items = ref<ProjectItem[]>([]);
const currentFolder = ref<FolderWithPath|undefined>();
const selectedItemIds = ref<Set<string>>(new Set());
const selectedItems = computed(() => items.value.filter(item => isItemSelected(item._id)));

const {
  media: newMedia,
  folders: newFolders,
  startTransfer
} = useFileTransfer();

watch([newMedia], () => {
  newMedia.value?.filter(m => {
    if (currentFolder.value) {
      return currentFolder.value._id === m.folderId
    } else {
      return !m.folderId;
    }
  }).map<ProjectItem>(m => ({
    _id: m._id,
    name: m.name,
    type: 'media',
    _createdAt: m._createdAt,
    _updatedAt: m._updatedAt,
    item: m
  })).forEach(item => items.value.push(item))
});

watch([newFolders], () => {
  // we only care about direct children of the current folder,
  // or top-level folders if we're not inside a folder
  const relevantFolders = newFolders.value?.filter(f =>
    currentFolder.value ? f.parentId === currentFolder.value._id : !f.parentId);
  
    const folderItems = relevantFolders?.map<ProjectItem>(f => ({
      _id: f._id,
      name: f.name,
      type: 'folder',
      item: f,
      _createdAt: f._createdAt,
      _updatedAt: f._updatedAt
    }));

    folderItems?.forEach(item => {
      const currentIndex = items.value.findIndex(f => f.type === item.type && f._id === item._id);
      if (currentIndex !== -1) {
        items.value[currentIndex] = Object.assign(items.value[currentIndex], item);
        return;
      }

      items.value.push(item);
    });
});

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
    projectId: ensure(route.params.projectId) as string,
    folderId: currentFolder.value?._id
  });
});

function isItemSelected(itemId: string) {
  return selectedItemIds.value.has(itemId);
}

/**
 * Selects the single item, unselecting
 * any currently selected items.
 * @param itemId
 */
function selectItem(itemId: string) {
  clearSelectedItems();
  selectedItemIds.value.add(itemId);
}

function toggleItemSelection(itemId: string) {
  if (isItemSelected(itemId)) {
    unselectItem(itemId);
  } else {
    selectItem(itemId);
  }
}

function toggleItemInMultiSelect(itemId: string) {
  if (isItemSelected(itemId)) {
    unselectItem(itemId);
  } else {
    addToSelection(itemId);
  }
}

/**
 * Selects the specified item without
 * unselecting other currently selected item
 * @param itemId 
 */
function addToSelection(itemId: string) {
  selectedItemIds.value.add(itemId);
}

function unselectItem(itemId: string) {
  selectedItemIds.value.delete(itemId);
}

function clearSelectedItems() {
  selectedItemIds.value.clear();
}

function handleToggleSelect(args: { type: ProjectItemType, itemId: string }) {
  toggleItemSelection(args.itemId);
}

function handleToggleInMultiSelect(args: { type: ProjectItemType, itemId: string }) {
  toggleItemInMultiSelect(args.itemId);
}

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

function handleDeleteRequested(args: { type: ProjectItemType, itemId: string }) {
  if (!isItemSelected(args.itemId)) {
    addToSelection(args.itemId);
  }

  nextTick(() => deleteItemsDialog.value?.open());
}

function handleItemsDeleted(
  { requestedItems }:
  { deletedCount: number, requestedItems: Array<{ _id: string, type: ProjectItemType }>}
) {
  for (let deletedItem of requestedItems) {
    const index = items.value.findIndex(item => item._id === deletedItem._id && item.type === deletedItem.type);
    if (index === -1) return;

    unselectItem(deletedItem._id);
    items.value.splice(index, 1);
  }
}

function handleMoveRequested(args: { type: ProjectItemType, itemId: string }) {
  if (!isItemSelected(args.itemId)) {
    addToSelection(args.itemId);
  }

  nextTick(() => moveItemsDialog.value?.open());
}

function handleItemsMoved(items: ProjectItem[]) {
  for (let item of items) {
    handleItemMoved(item);
  }
}

function handleItemMoved(item: ProjectItem) {
  const index = items.value.findIndex(i => i._id === item._id);
  const itemFolderId = item.type === 'folder' ? item.item.parentId : item.item.folderId;
  
  const isMovedToThisFolder =  (!itemFolderId && !currentFolder.value) || itemFolderId === currentFolder.value?._id;
  if (index === -1 && isMovedToThisFolder) {
    // the item is being moved to this folder, but is not in the list of items
    // add it to the list
    items.value.push(item);
  }
  else if (index !== -1 && isMovedToThisFolder) {
    // the item is being moved to this folder, but is already
    // in the list of item. 
    // updated it
    items.value[index] = Object.assign(items.value[index], item);
  }
  else if (index !== -1 && !isMovedToThisFolder) {
    // the item is in the current list of items, but
    // is moved to a different folder
    // remove the item from the list
    items.value.splice(index, 1);
    unselectItem(item._id);
  }
  // last possibility: item does not exist in the current list
  // and is not being moved to this folder. Ignore it.
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

  // if it already exists, then no need to add it
  if (items.value.findIndex(f => f._id === item._id) >= 0) {
    return;
  }

  items.value.push(item);
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