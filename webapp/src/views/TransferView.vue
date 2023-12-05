<template>
  <div v-if="transfer" class="flex flex-1 flex-col items-stretch">
    <div class="text-white text-2xl pt-2 pb-5">{{ transfer.name }}</div>
    <div class="flex flex-1 flex-col items-stretch">
      <div class="relative mb-6" @click="copyDownloadUrl()">
        <div class="absolute left-0 right-0 overflow-auto border p-2 rounded-md">
          {{ downloadUrl }}
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
import { ensure, getTransferDownloadUrl, humanizeSize, pluralize } from '@/core';
import type { GetTransferResult } from '@/core';


console.log('transfer view');
const { copy } = useClipboard();
const transfer = ref<GetTransferResult>();
const loading = ref(false);
const route = useRoute();
console.log('route', route);
const downloadUrl = computed(() => transfer.value ? getTransferDownloadUrl(transfer.value._id) : '');

onMounted(async () => {
  const transferId = route.params.transferId as string;
  console.log('on mount', transferId);
  if (!transferId) return;

  await initTransfer(transferId);
})

watch(
  () => route.params.transferId,
  async (transferId) => {
    console.log('in watch', transferId);
    if (!transferId) return;
    await initTransfer(transferId as string);
});

function copyDownloadUrl() {
  if (!downloadUrl.value) return;

  copy(downloadUrl.value);
}

onBeforeRouteUpdate(async (from, to) => {
  console.log('in before update', from, 'to', to);
  if (from.params.transferId === to.params.transferId) {
    return;
  }

  await initTransfer(to.params.transferId as string);
});

async function initTransfer(transferId: string) {
  const user = ensure(store.userAccount.value);
  loading.value = true;
  
  try {
    console.log('fetching transfer', transferId);
    transfer.value = await apiClient.getTransfer(user.account._id, transferId);
    console.log('fetched transfer', transfer.value);
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