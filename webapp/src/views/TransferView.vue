<template>
  <div v-if="transfer" class="flex flex-1 flex-col items-stretch text-[#d1bfcd]" :style="{ height }">
    <div class="text-white text-2xl p-5">{{ transfer.name }}</div>
    <div class="flex flex-col items-stretch p-5">
      <div>
        {{ transfer.numFiles }} {{ pluralize('file', transfer.numFiles) }} - {{ humanizeSize(transfer.totalSize) }}
      </div>
      <div>
        Sent on {{ new Date(transfer._createdAt).toLocaleDateString() }}
      </div>
      <div class="relative mb-6 flex gap-2" @click="copyDownloadUrl()">
        Download link: <a class="link" :href="downloadUrl" target="_blank">{{ downloadUrl }}</a>
        <span @click="copyDownloadUrl" class="text-primary-content hover:underline hover:cursor-pointer">Copy link</span>
      </div>
    </div>
    <div class="flex-1 pt-5 overflow-y-auto">
      <div class="flex flex-1 flex-col items-stretch">
        <div v-for="file in transfer.files"
          :key="file._id"
          class="flex justify-between text-sm text-[#d1bfcd] first:border-t border-[#131319] border-b
          px-5 py-4 hover:cursor-pointer hover:text-purple-100"
        >
          <div>
            {{ file.name }}
          </div>
          <div class="text-xs flex flex-col items-end">
            <div>{{ getFileExtension(file.name) }} - {{ humanizeSize(file.size) }}</div>
            <div>{{ new Date(transfer._createdAt).toLocaleDateString() }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, onBeforeRouteUpdate } from 'vue-router';
import { useClipboard } from '@vueuse/core';
import { store, apiClient, showToast, logger } from '@/app-utils';
import { ensure, getFileExtension, getTransferDownloadUrl, humanizeSize, pluralize } from '@/core';
import type { GetTransferResult } from '@/core';
import { layoutDimensions } from '@/styles/dimentions';

const { copy } = useClipboard();
const transfer = ref<GetTransferResult>();
const loading = ref(false);
const route = useRoute();
const downloadUrl = computed(() => transfer.value ? getTransferDownloadUrl(transfer.value._id) : '');
const height = `calc(100dvh - ${layoutDimensions.navBarHeight}px)`;

onMounted(async () => {
  const transferId = route.params.transferId as string;
  if (!transferId) return;

  await initTransfer(transferId);
})

watch(
  () => route.params.transferId,
  async (transferId) => {
    if (!transferId) return;
    await initTransfer(transferId as string);
});

function copyDownloadUrl() {
  if (!downloadUrl.value) return;

  copy(downloadUrl.value);
}

onBeforeRouteUpdate(async (from, to) => {
  if (from.params.transferId === to.params.transferId) {
    return;
  }

  await initTransfer(to.params.transferId as string);
});

async function initTransfer(transferId: string) {
  const account = ensure(store.currentAccount.value);
  loading.value = true;
  
  try {
    transfer.value = await apiClient.getTransfer(account._id, transferId);
  }
  catch (e: any) {
    logger.error(e);
    showToast(e.message, 'error');
  }
  finally {
    loading.value = false;
  }
}
</script>