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
        <UiButton
            title="Upload files"
            @click="openFilePicker()"
            primary
            lg
          >
          <PlusIcon class="h-5 w-5" /><span class="hidden sm:inline">Upload media</span>
        </UiButton>
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
      <div v-if="media.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2">
        <div class="text-center">
          You have no media in this project. Upload some files using the button below.
        </div>

        <UiButton @click="openFilePicker()" primary lg>Upload Files</UiButton>
      </div>
      <div
        v-else
        class="grid grid-cols-2 gap-2 overflow-y-auto sm:gap-4 sm:grid-cols-3 lg:w-full lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]"
        
      >
        <div
          v-for="medium in filteredMedia"
          :key="medium._id"
          class="w-full aspect-square"
        >
          <MediaCardItem
            :media="medium"
            @update="handleMediaUpdate($event)"
            @delete="handleMediaDeletion($event)"
          />
        </div>
      </div>
    </UiLayout>
  </UiLayout>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { onBeforeRouteUpdate, useRoute, type RouteLocationNormalizedLoaded } from 'vue-router';
import { apiClient, showToast, store, logger, useFilePicker, useFileTransfer } from '@/app-utils';
import { ensure, pluralize, type Media } from '@/core';
import type { WithRole, Project } from "@quickbyte/common";
import { PlusIcon, ArrowUpCircleIcon, ArrowsUpDownIcon, CheckIcon } from '@heroicons/vue/24/outline'
import MediaCardItem from '@/components/MediaCardItem.vue';
import RequireRole from '@/components/RequireRole.vue';
import UiLayout from '@/components/ui/UiLayout.vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import { UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator } from "@/components/ui/menu";
import { getRemainingContentHeightCss, layoutDimensions } from '@/styles/dimentions';

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

const route = useRoute();
const loading = ref(true);
const searchTerm = ref('');
const sortFields = [
  {
    field: '_createdAt',
    displayName: 'Date Uploaded',
    ascName: 'Oldest first',
    descName: 'Newest first',
    compare: (a: Media, b: Media) => {
      return new Date(a._createdAt).getTime() - new Date(b._createdAt).getTime();
    }
  },
  {
    field: '_updatedAt',
    displayName: 'Date modified',
    ascName: 'Oldest first',
    descName: 'Newest first',
    compare: (a: Media, b: Media) => {
      return new Date(a._updatedAt).getTime() - new Date(b._updatedAt).getTime();
    }
  },
  {
    field: 'name',
    displayName: 'Name',
    ascName: 'A-Z',
    descName: 'Z-A',
    compare: (a: Media, b: Media) => {
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
const {
  media: newMedia,
  startTransfer
} = useFileTransfer();

watch([newMedia], () => {
  if (newMedia.value?.length) {
    media.value = media.value.concat(newMedia.value);
  }
})

const filteredMedia = computed(() => {
  if (!searchTerm.value && !queryOptions.value) return media.value;

  let result = [...media.value];
  if (searchTerm) {
    const regex = new RegExp(searchTerm.value, 'i');
    result = media.value.filter(m => regex.test(m.name));
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

function handleMediaUpdate(updatedMedia: Media) {
  const index = media.value.findIndex(m => m._id === updatedMedia._id);
  if (index < 0) return;
  
  const original = media.value[index];

  media.value[index] = Object.assign(original, updatedMedia);
}

function handleMediaDeletion(mediaId: string) {
  const index = media.value.findIndex(m => m._id === mediaId);
  if (index < 0) return;

  media.value.splice(index, 1);
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

// onMounted callback is not called when navigating from one
// media page to another (i.e. when the route is the same
// but params have changed) because the same component is reused
// onBeforeRouteUpdate callback is called when the route params
// changed and the component is reused, but is not called
// when the component is mounted.
// So to handle both scenarios I pass the same callback to
// both methods.
// I feel like there should be a better way of dealing
// with this.
async function loadData(to: RouteLocationNormalizedLoaded) {
  const projectId = ensure(to.params.projectId) as string;
  const account = ensure(store.currentAccount.value);
  project.value = ensure(store.projects.value.find(p => p._id === projectId, `Expected project '${projectId}' to be in store on media page.`));
  loading.value = true;

  try {
    media.value = await apiClient.getProjectMedia(account._id, projectId);
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
    
  } finally {
    loading.value = false;
  }
}

onMounted(async () => await loadData(route));
onBeforeRouteUpdate(loadData);
</script>