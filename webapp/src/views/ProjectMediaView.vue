<template>
  <div v-if="!loading">
    <div v-if="media.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2">
      You have no media in this project. Upload some files using the button below.

      <button @click="openFilePicker()" class="btn btn-primary">Upload Files</button>
    </div>
    <div
      v-else
      class="grid"
      style="grid-gap:10px;grid-template-columns: repeat(auto-fill,minmax(288px,1fr))"
    >
      <div class="w-[288px] h-[288px] rounded-md border border-gray-600 flex items-center justify-center">
        <ArrowUpOnSquareIcon @click="openFilePicker()" class="h-24 w-24 hover:text-white hover:cursor-pointer" />
      </div>
      <div
        v-for="medium in media"
        :key="medium._id"
        class="bg-slate-500 w-[288px] rounded-md border border-gray-600"
      >
        <div class="h-[240px] bg-black flex items-center justify-center">
          <PlayIcon class="h-24 w-24"/>
        </div>
        <div class="h-12 border-t border-gray-600 flex flex-row items-center p-2">
          <router-link :to="{ name: 'player', params: { projectId: medium.projectId, mediaId: medium._id } }">
            {{ medium.name }}
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute} from 'vue-router';
import { apiClient, showToast, store, logger, useFilePicker, useFileTransfer } from '@/app-utils';
import { ensure, pluralize, type Media } from '@/core';
import { PlayIcon, ArrowUpOnSquareIcon } from '@heroicons/vue/24/outline'

const route = useRoute();
const loading = ref(false);
const {
  openFilePicker,
  onFilesSelected,
  onError
} = useFilePicker();

const media = ref<Media[]>([]);
const {
  media: newMedia,
  transfer,
  uploadState,
  startTransfer
} = useFileTransfer();

watch([newMedia], () => {
  if (newMedia.value?.length) {
    media.value = media.value.concat(newMedia.value);
  }
})

onError((e) => {
  logger.error(e.message, e);
  showToast(e.message, 'error');
});

onFilesSelected(async (files, directories) => {
  // start transfer
  showToast(`Uploading ${files.length} ${pluralize('file', files.length)}...`, 'info');
  await startTransfer({
    files: files,
    directories: directories,
    projectId: ensure(route.params.projectId) as string
  });
});

onMounted(async () => {
  const projectId = ensure(route.params.projectId) as string;
  const user = ensure(store.userAccount.value);
  loading.value = true;

  try {
    media.value = await apiClient.getProjectMedia(user.account._id, projectId);
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  } finally {
    loading.value = false;
  }
});
</script>