<template>
  <UiLayout fill>
    <!-- start header -->
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

      <!-- start sort dropdown -->
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
      <!-- end sort dropdown -->

      <!-- multi-selection checkbox -->
      <UiLayout
        :title="multiSelectCheckBoxTitle"
        v-if="selectedItemIds.size > 0"
      >
        <UiCheckbox
          class="bg-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
          :checked="multiSelectCheckBoxState"
          @update:checked="handleMultiSelectCheckboxStateChange($event)"
        />
      </UiLayout>
      <!-- end multi-selection checkbox -->
    </UiLayout>
    <!-- end header -->

    <!-- start content -->
    <UiContextMenu>
      <UiLayout ref="dropzone" innerSpace fill verticalScroll :fixedHeight="contentHeight" class="fixed" fullWidth
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
        <div v-if="items.length === 0 && !itemsQueryPending" class="flex flex-1 flex-col items-center justify-center gap-2">
          <div class="text-center">
            You have no media in this {{ currentFolder ? 'folder' : 'project' }}. Upload some files using the button below.
          </div>

          <UiButton @click="openFilePicker()" primary lg>Upload Files</UiButton>
        </div>
        <div v-else-if="itemsQueryPending" class="flex flex-1 flex-col items-center gap-2">
          
          <div
            
            class="grid grid-cols-2 gap-2 w-full overflow-y-auto sm:gap-4 sm:grid-cols-3 lg:w-full lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]"
          >
            <div
              class="w-full aspect-square"
              v-for="_ in 12"
            >
              <ProjectItemSkeleton />
            </div>
          </div>
        </div>
        <!--
          The DragSelect captures clicks on the DragSelectOption and interferes with
          click events from the ProjectItemCard, that's why we disable
          the clickOptionToSelect and draggableOnOption props.
          The downside is that you have to trag from outside a ProjectItemCard
          to effectively drag-select elements. If you drag from inside a ProjectItemCard,
          the item from which you started dragging will not be included in the selection.
          I think that's a lesser evil.
        -->
        <DragSelect
          v-else
          :modelValue="selectedItemIds"
          @update:modelValue="handleDragSelect($event)"
          :clickOptionToSelect="false"
          :draggableOnOption="false"
        >
          <div
            
            class="grid grid-cols-2 gap-2 overflow-y-auto sm:gap-4 sm:grid-cols-3 lg:w-full lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]"
          >
            
            <DragSelectOption v-for="item in filteredItems" :key="item._id" :value="item._id">
              <div
                class="w-full aspect-square"
              >
                
                  <ProjectItemCard
                    v-if="project"
                    :item="item"
                    :selected="isItemSelected(item._id)"
                    :showSelectCheckbox="selectedItemIds.size > 0"
                    :totalSelectedItems="selectedItemIds.size"
                    :allowUpload="project.role === 'owner' || project.role === 'admin' || project.role === 'editor'"
                    @delete="handleDeleteRequested($event)"
                    @move="handleMoveRequested($event)"
                    @share="handleShareProjectItems($event)"
                    @toggleSelect="handleToggleSelect($event)"
                    @toggleInMultiSelect="handleToggleInMultiSelect($event)"
                    @selectAll="handleSelectAll()"
                    @unselectAll="handleUnselectAll()"
                  />
              </div>
                
              
            </DragSelectOption>
          </div>
        </DragSelect>
      </UiLayout>
      <template #menu v-if="project">
        <RequireRole :accepted="['owner', 'admin', 'editor']" :current="project.role">
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
          <UiMenuSeparator />
          <UiMenuItem @click="createFolder()">
            <UiLayout horizontal itemsCenter gapSm>
              <FolderPlusIcon class="h-5 w-5" /> Create folder
            </UiLayout>
          </UiMenuItem>
          <template v-if="selectedItemIds.size > 0">
            <UiMenuSeparator />
            <UiMenuItem @click="handleShareProjectItems()">
              <UiLayout horizontal itemsCenter gapSm>
                <ShareIcon class="h-5 w-5" />
                <span>Share {{ selectedItemIds.size }} {{ pluralize('item', selectedItemIds.size) }}</span>
              </UiLayout>
            </UiMenuItem>
            <UiMenuItem @click="handleMoveRequested()">
              <UiLayout horizontal itemsCenter gapSm>
                <ArrowRightCircleIcon class="w-5 h-5" />
                <span>Move {{ selectedItemIds.size }} {{ pluralize('item', selectedItemIds.size) }} to...</span>
              </UiLayout>
            </UiMenuItem>
            <UiMenuItem @click="handleDeleteRequested()">
              <UiLayout horizontal itemsCenter gapSm>
                <TrashIcon class="w-5 h-5" />
                <span>Delete {{ selectedItemIds.size }} {{ pluralize('item', selectedItemIds.size) }}</span>
              </UiLayout>
            </UiMenuItem>
            <UiMenuSeparator />
            <UiMenuItem @click="handleSelectAll()">
              <UiLayout horizontal itemsCenter gapSm>
                <DocumentPlusIcon class="w-5 h-5" />
                <span>Select all</span>
              </UiLayout>
            </UiMenuItem>
            <UiMenuSeparator />
            <UiMenuItem @click="handleUnselectAll()">
              <UiLayout horizontal itemsCenter gapSm>
                <DocumentMinusIcon class="w-5 h-5" />
                <span>Unselect all</span>
              </UiLayout>
            </UiMenuItem>
          </template>
          <UiMenuSeparator />
        </RequireRole>
        <UiMenuItem>
          <router-link :to="{ name: 'project-settings', params: { projectId: project._id } }">
            <UiLayout horizontal itemsCenter gapSm>
              <Cog8ToothIcon class="h-5 w-5" /> Project settings
            </UiLayout>
          </router-link>
        </UiMenuItem>
      </template>
    </UiContextMenu>
    <!--end content -->
  </UiLayout>
  <CreateFolderDialog
    v-if="project"
    ref="createFolderDialog"
    :projectId="project._id"
    :parentId="currentFolder?._id"
  />
  <DeleteProjectItemsDialog
    v-if="project"
    ref="deleteItemsDialog"
    :projectId="project._id"
    :items="selectedItems"
    :folderId="currentFolder?._id"
    @delete="handleItemsDeleted($event)"
  />
  <MoveProjectItemsDialog
    v-if="project"
    ref="moveItemsDialog"
    :projectId="project._id"
    :items="selectedItems"
    @move="handleItemsMoved($event)"
  />
  <CreateProjectShareDialog
    v-if="project"
    ref="createProjectShareDialog"
    :project="project"
    :items="selectedItems"
  />
</template>
<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { showToast, store, logger, useFilePicker, useFileTransfer, useProjectItemsQuery, upsertProjectItemsInQuery, deleteProjectItemsInQuery } from '@/app-utils';
import { ensure, pluralize, unwrapSingleton, unwrapSingletonOrUndefined } from '@/core';
import type {
  ProjectItem, Folder,
  ProjectItemType, ProjectFolderItem, FolderWithPath, Media, 
} from "@quickbyte/common";
import {
  PlusIcon, ArrowUpCircleIcon, ArrowsUpDownIcon, CheckIcon,
  FolderPlusIcon, DocumentArrowUpIcon, CloudArrowUpIcon,
  Cog8ToothIcon, TrashIcon, ArrowRightCircleIcon,
  DocumentPlusIcon, DocumentMinusIcon,
  ShareIcon } from '@heroicons/vue/24/outline'
import ProjectItemCard from '@/components/ProjectItemCard.vue';
import ProjectItemSkeleton from '@/components/ProjectItemSkeleton.vue';
import DeleteProjectItemsDialog from '@/components/DeleteProjectItemsDialog.vue';
import MoveProjectItemsDialog from '@/components/MoveProjectItemsDialog.vue';
import RequireRole from '@/components/RequireRole.vue';
import CreateFolderDialog from "@/components/CreateFolderDialog.vue";
import { CreateProjectShareDialog } from "@/components/project-share";
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import { UiMenu, UiMenuItem, UiMenuLabel, UiLayout, UiButton, UiCheckbox, UiContextMenu, UiMenuSeparator, UiSkeleton } from "@/components/ui";
import { DragSelect, DragSelectOption } from "@coleqiu/vue-drag-select";
import { getRemainingContentHeightCss, layoutDimensions } from '@/styles/dimentions';
import { injectFolderPathSetter } from "./project-utils";
import { useQueryClient } from '@tanstack/vue-query'

const headerHeight = layoutDimensions.projectMediaHeaderHeight;
// tried different things to get the positioning to look right
const contentOffset = headerHeight + layoutDimensions.navBarHeight + layoutDimensions.projectHeaderHeight + 2;
const contentHeight = getRemainingContentHeightCss(
  contentOffset
);


const queryClient = useQueryClient();
const updateCurrentFolderPath = injectFolderPathSetter();
const route = useRoute();
const createFolderDialog = ref<typeof CreateFolderDialog>();
const deleteItemsDialog = ref<typeof DeleteProjectItemsDialog>();
const moveItemsDialog = ref<typeof MoveProjectItemsDialog>();
const createProjectShareDialog = ref<typeof CreateProjectShareDialog>();
const searchTerm = ref('');

const projectId = computed(() => unwrapSingleton(route.params.projectId));
const folderId = computed(() => unwrapSingletonOrUndefined(route.params.folderId || undefined));

const itemsQuery = useProjectItemsQuery(projectId, folderId);
const itemsQueryPending = computed(() => itemsQuery.isPending.value);
const items = computed(() => itemsQuery.data.value ? itemsQuery.data.value.items : []);

const { sortFields, queryOptions, selectedSortField, selectSortField } = store.projectItemsQueryOptions;

//const project = ref<WithRole<Project>>();
const project = computed(() =>
  ensure(store.projects.value.find(p => p._id === projectId.value, `Expected project '${projectId.value}' to be in store on media page.`))
);

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

const currentFolder = ref<FolderWithPath|undefined>();
const selectedItemIds = ref<Set<string>>(new Set());
const selectedItems = computed(() => items.value.filter(item => isItemSelected(item._id)));
const multiSelectCheckBoxState = computed<'indeterminate'|boolean>(() => {
  const state = items.value?.length === 0 ? false
  : selectedItemIds.value.size === items.value.length ? true
  : selectedItemIds.value.size === 0 ? false
  : 'indeterminate';
  return state;
});
const multiSelectCheckBoxTitle = computed(() => {
  return selectedItemIds.value.size === items.value.length ?
    'Click to clear selection' : 'Click to select all';
});

const {
  media: newMedia,
  folders: newFolders,
  startTransfer
} = useFileTransfer();

watch([newMedia], () => {
  const newMediaInCurrentFolder = newMedia.value?.filter(m => {
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
  }));

  if (!newMediaInCurrentFolder) {
    return;
  }

  upsertProjectItemsInQuery(queryClient, projectId, folderId, ...newMediaInCurrentFolder);
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

    if (folderItems) {
      upsertProjectItemsInQuery(queryClient, projectId, folderId, ...folderItems);
    }
});

watch(itemsQuery.error, (error) => {
  if (error) {
    logger?.error(error.message, error);
    showToast(error.message, 'error');
  }
});

watch(itemsQuery.data, (data) => {
  if (!data) return;
  // TODO: we should not clear selectedItems if data has changed but the path
  // has not, data might be updated due to background re-fetch
  selectedItemIds.value.clear();
  currentFolder.value = data.folder;
  updateCurrentFolderPath && updateCurrentFolderPath(data.folder?.path || []);
}, { immediate: true });

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

function selectAllItems() {
  for (let item of items.value) {
    selectedItemIds.value.add(item._id);
  }
}

function handleToggleSelect(args: { type: ProjectItemType, itemId: string }) {
  toggleItemSelection(args.itemId);
}

function handleToggleInMultiSelect(args: { type: ProjectItemType, itemId: string }) {
  toggleItemInMultiSelect(args.itemId);
}

function handleDeleteRequested(args?: { type: ProjectItemType, itemId: string }) {
  if (args && !isItemSelected(args.itemId)) {
    addToSelection(args.itemId);
  }

  nextTick(() => deleteItemsDialog.value?.open());
}

function handleItemsDeleted(
  { requestedItems }:
  { deletedCount: number, requestedItems: Array<{ _id: string, type: ProjectItemType }>}
) {
  for (let deletedItem of requestedItems) {
    unselectItem(deletedItem._id);
  }
}

function handleMoveRequested(args?: { type: ProjectItemType, itemId: string }) {
  if (args && !isItemSelected(args.itemId)) {
    addToSelection(args.itemId);
  }

  nextTick(() => moveItemsDialog.value?.open());
}

function handleItemsMoved(items: ProjectItem[]) {
  // In all cases, we assume that the items are being moved from the current folder
  // to some target folder, since that's what the UI enables to do. Under this assumption,
  // we can simply remove all moved items from the current folder and add them to the
  // respective current folders. We don't have to worry about other folders.
  // If this assumption does not hold anymore, we should invalidate all cached project items query data under this
  // project because we don't know which other folders have lost items to the move operation.

  // TODO: is there any reason for this grouping? Given the current UI
  // aren't all items getting moved to the same target folder?
  const itemsByTargetFolder = new Map<string|undefined, ProjectItem[]>();
  for (const item of items) {
    const itemFolderId = item.type === 'folder' ? item.item.parentId : item.item.folderId;
    const groupedItems = itemsByTargetFolder.get(itemFolderId || undefined) || [];
    groupedItems.push(item);
    itemsByTargetFolder.set(itemFolderId || undefined, groupedItems);
  }

  deleteProjectItemsInQuery(queryClient, projectId, folderId, ...items);
  for (const [targetFolder, movedItems] of itemsByTargetFolder) {
    upsertProjectItemsInQuery(queryClient, projectId, targetFolder, ...movedItems);
  }

}

function handleShareProjectItems(item?: { type: ProjectItemType, itemId: string }) {
  if (item && !isItemSelected(item.itemId)) {
    addToSelection(item.itemId);
  }

  if (!selectedItems.value.length) {
    return;
  }
  nextTick(() => createProjectShareDialog.value?.open());
}

function createFolder() {
  createFolderDialog.value?.open();
}

function handleMultiSelectCheckboxStateChange(checked: boolean) {
  if (!checked) {
    clearSelectedItems();
  } else {
    selectAllItems();
  }
}

function handleSelectAll() {
  selectAllItems();
}

function handleUnselectAll() {
  clearSelectedItems();
}

function handleDragSelect(dragSelected: Set<unknown>|Array<unknown>) {
  for (let itemId of dragSelected) {
    addToSelection(itemId as string);
  }
}
</script>