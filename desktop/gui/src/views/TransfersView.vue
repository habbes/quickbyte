<template>
  <div class="flex-1 h-full flex flex-col px-4 py-2 text-xs text-gray-200">
    <!-- header -->
    <div class="flex py-2 border-b-[0.5px] border-b-gray-700 font-bold">
      <div class="flex-1">
        Name
      </div>
      <div class="w-[85px]">
        Files
      </div>
      <div class="w-[85px]">
        Size
      </div>
      <div class="w-[85px]">
        Status
      </div>
    </div>
    <!-- body -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-for="transfer in transfers"
        :key="transfer._id"
        class="group flex py-2 border-b-[0.5px] border-b-gray-700 cursor-pointer"
        @click="goToTransfer(transfer._id)"
        @contextmenu="showContextMenu($event, transfer)"
      >
        <div class="flex-1 group-hover:text-white">
          {{ transfer.name }}
        </div>
        <div class="w-[85px] group-hover:text-white">
          {{ transfer.numFiles }}
        </div>
        <div class="w-[85px] group-hover:text-white">
          {{ humanizeSize(transfer.totalSize) }}
        </div>
        <div class="w-[85px]">
          <TransferStatus :transfer="transfer" />
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";
import { showMenu } from "tauri-plugin-context-menu";
import { useRouter } from "vue-router";
import { store, getAppInfo } from "@/app-utils";
import { type TransferJob, showPathInFileManager, deleteTransfer, cancelTransfer, getSystemFileExplorerName } from "@/core";
import { humanizeSize } from "@quickbyte/common";
import TransferStatus from "@/components/TransferStatus.vue";

type ContextMenuOptions = Parameters<typeof showMenu>[0];

const router = useRouter();
const transfers = computed(() => [...store.transfers.value].sort((a, b) => a.name.localeCompare(b.name)));

function goToTransfer(id: string) {
  router.push({ name: 'transfer', params: { id } });
}

function showContextMenu(event: MouseEvent, transfer: TransferJob) {
  event.preventDefault();
  const appInfo = getAppInfo();

  const items: ContextMenuOptions['items'] = [{
    label: `Reveal in ${getSystemFileExplorerName(appInfo.os.type)}`,
    event: async function() {
      showPathInFileManager(transfer.localPath);
    }
  }, {
    label: 'Show transfer files',
    event: async () => router.push({ name: 'transfer', params: { id: transfer._id } })
  }];

  if (transfer.status === 'pending' || transfer.status === 'progress') {
    items.push({
      label: 'Cancel all files in transfer',
      event: async () => cancelTransfer({ transferId: transfer._id })
    })
  }

  if (transfer.status !== 'pending' && transfer.status !== 'progress') {
    items.push({
      label: 'Delete records',
      event: async () => deleteTransfer(transfer._id)
    });
  }

  showMenu({
    items
  });
}
</script>