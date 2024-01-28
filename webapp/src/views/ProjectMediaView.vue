<template>
  <UiLayout fill>
    <UiLayout
      horizontal
      innerSpace
      gapSm
      itemsCenter
      justifyBetween
      class="border-b border-[#2e2634]"
    >
      <UiLayout fill>
        <UiSearchInput v-model="searchTerm" placeholder="Search files" />
      </UiLayout>
      <RequireRole v-if="project" :accepted="['admin', 'owner', 'editor']" :current="project.role">
        <Menu as="div" class="relative inline-block">
          <MenuButton>
            <UiButton
              class="btn btn-primary"
            >
              <PlusIcon class="h-5 w-5" /><span class="hidden sm:inline">Upload media</span>
            </UiButton>
          </MenuButton>
          <MenuItems class="absolute text-black right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-20">
            <div
              v-for="option in uploadMenuOptions"
              :key="option.text"
            >
              <MenuItem
              >
                <UiLayout @click="option.onClick()" innerSpace>
                  {{ option.text }}
                </UiLayout>
              </MenuItem>
            </div>
          </MenuItems>
        </Menu>
      </RequireRole>
    </UiLayout>
    <UiLayout v-if="!loading" innerSpace fill verticalScroll>
      <div v-if="media.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2">
        You have no media in this project. Upload some files using the button below.

        <button @click="openFilePicker()" class="btn btn-primary">Upload Files</button>
      </div>
      <div
        v-else
        class="grid overflow-y-auto"
        style="grid-gap:10px;grid-template-columns: repeat(auto-fill,minmax(250px,1fr))"
      >
        <div
          v-for="medium in filteredMedia"
          :key="medium._id"
          class="w-full aspect-square"
        >
          <MediaCardItem :media="medium"/>
        </div>
      </div>
    </UiLayout>
  </UiLayout>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router';
import { apiClient, showToast, store, logger, useFilePicker, useFileTransfer } from '@/app-utils';
import { ensure, pluralize, type Media } from '@/core';
import type { WithRole, Project } from "@quickbyte/common";
import { PlusIcon } from '@heroicons/vue/24/outline'
import MediaCardItem from '@/components/MediaCardItem.vue';
import RequireRole from '@/components/RequireRole.vue';
import UiLayout from '@/components/ui/UiLayout.vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiButton from '@/components/ui/UiButton.vue';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';

const headerHeight = `48px`;
const route = useRoute();
const loading = ref(false);
const searchTerm = ref('');
const project = ref<WithRole<Project>>();
const {
  openFilePicker,
  onFilesSelected,
  onError,
  reset
} = useFilePicker();

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
  if (!searchTerm.value) return media.value;

  const regex = new RegExp(searchTerm.value, 'i');
  return media.value.filter(m => regex.test(m.name));
});

const uploadMenuOptions = [
  {
    text: 'Upload files',
    onClick: () => openFilePicker()
  }
]

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

async function loadRoute(to: RouteLocationNormalizedLoaded) {
  // const to = route;
  console.log('inside hook');
  const projectId = ensure(to.params.projectId) as string;
  const account = ensure(store.currentAccount.value);
  project.value = ensure(store.projects.value.find(p => p._id === projectId, `Expected project '${projectId}' to be in store on media page.`));
  console.log('project media', projectId, project.value);
  loading.value = true;

  try {
    console.log('run fetch');
    media.value = await apiClient.getProjectMedia(account._id, projectId);
    console.log('root media', media.value);
  } catch (e: any) {
    console.log('handling error', e);
    logger.error(e.message, e);
    showToast(e.message, 'error');
    
  } finally {
    loading.value = false;
  }

  console.log('DONE');
}

onMounted(async () => {
  await loadRoute(route);
});

// watching the route instead of using
// onMounted or onBeforeRouteUpdate
// so that we can we can load the data
// both when the page is mounted (navigated to from another page)
// and when the page is re-used with different route params (same route, different projectId)
watch([route], async () => {
  const to = route;
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
});
</script>