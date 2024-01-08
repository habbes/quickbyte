<template>
  <div class="flex flex-1 flex-col items-stretch px-5 overflow-y-auto">
    <div
      class="flex flex-grow flex-col items-stretch overflow-y-auto"
      :style="{ height: contentHeight }"
    >
      <router-link v-for="transfer in transfers"
        :to="{ name: 'transfer', params: { transferId: transfer._id }}"
        class="flex justify-between text-sm text-[#d1bfcd] border-[#131319] border-b
        px-2 py-4 hover:cursor-pointer hover:text-purple-100"
      >
        <div class="hover:underline">
          {{ transfer.name }}
        </div>
        <div class="text-xs flex flex-col items-end">
          <div>{{ transfer.numFiles }} {{ pluralize('file', transfer.numFiles) }} - {{ humanizeSize(transfer.totalSize) }}</div>
          <div>{{ new Date(transfer._createdAt).toLocaleDateString() }}</div>
        </div>
      </router-link>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { store, apiClient, showToast, logger } from '@/app-utils';
import { ensure, humanizeSize, pluralize } from '@/core';
import type { Transfer } from '@/core';
import { layoutDimensions } from '@/styles/dimentions';

console.log('transfers list view');
const transfers = ref<Transfer[]>([]);
const loading = ref(false);
const contentHeight = `calc(100vh - ${layoutDimensions.navBarHeight}px)`;

onMounted(async () => {
  await fetchTransfers();
});

watch(store.currentAccount, async () => {
  await fetchTransfers();
})

async function fetchTransfers() {
  const account = ensure(store.currentAccount.value);
  loading.value = true;
  try {
    // we fetch the transfers in the user's personal account
    // regardless of which account is currently selected.
    const result = await apiClient.getTransfers(account._id);
    transfers.value = result.sort((t1, t2) => new Date(t2._createdAt).getTime() - new Date(t1._createdAt).getTime());
    transfers.value = transfers.value.concat(transfers.value.map(t => ({ ...t, _id: `l${t._id}`})));
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