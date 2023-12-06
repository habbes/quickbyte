<template>
  <div class="flex flex-1 flex-col items-stretch">
    <div class="text-white text-2xl pt-2 pb-5">Transfers</div>
    <div class="flex flex-1 flex-col items-stretch">
      <router-link v-for="transfer in transfers"
        :to="{ name: 'transfer', params: { transferId: transfer._id }}"
        class="flex justify-between text-sm text-purple-200 first:border-t-[0.5px] border-[#131319] border-b-[0.5px]
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
import { onMounted, ref } from 'vue';
import { store, apiClient, showToast, logger } from '@/app-utils';
import { ensure, humanizeSize, pluralize } from '@/core';
import type { Transfer } from '@/core';

console.log('transfers list view');
const transfers = ref<Transfer[]>([]);
const loading = ref(false);

onMounted(async () => {
  const user = ensure(store.userAccount.value);
  loading.value = true;
  try {
    const result = await apiClient.getTransfers(user.account._id);
    transfers.value = result.sort((t1, t2) => new Date(t1._createdAt).getTime() - new Date(t2._createdAt).getTime());
  }
  catch (e: any) {
    logger.error(e);
    showToast(e.message, 'error');
  }
  finally {
    loading.value = false;
  }
});
</script>