<template>
  <div v-if="!loading">
    <div v-if="media.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2">
      You have no media in this project. Upload some files using the button below.

      <button @click="openFilePicker()" class="btn btn-primary">Upload Files</button>
    </div>
    <div v-else v-for="medium in media" :key="medium._id">
      {{ medium.name }}
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute} from 'vue-router';
import { apiClient, showToast, store, logger, useFilePicker, useFileTransfer } from '@/app-utils';
import { ensure, type Media } from '@/core';

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
  showToast(`Uploading ${files.length} files...`, 'info');
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