<template>
  <div v-if="transfer">
    <PageHeader>
      <div class="h-full flex-1 flex items-center text-sm gap-2 justify-between">
        <div class="flex gap-2 items-center">
          <router-link :to="{ name: 'transfers' }" title="Go back" class="hover:text-white">
            <Icon icon="lucide:arrow-left" />
          </router-link>
          <div class="truncate text-ellipsis whitespace-nowrap overflow-hidden" :title="transfer.name">
            {{ transfer.name }}
          </div>
        </div>

        <div class="flex items-center gap-2 text-xs text-gray-300">
          <div>
            {{ transfer.numFiles }} {{ pluralize("file", transfer.numFiles) }}
          </div>
          <Icon icon="lucide:dot" />
          <div>
            {{ humanizeSize(transfer.totalSize) }}
          </div>
          <Icon icon="lucide:dot" />
          <TransferStatus :transfer="transfer" />
        </div>
      </div>
    </PageHeader>
    <div>
      <FileTree
        :files="transfer.files"
        v-slot="{ item }"
      >
        <div
          class="flex flex-1 w-full justify-between items-center" v-if="item.file"
          @contextmenu="showFileContextMenu($event, item.file)"
        >
          <div>
            {{ item.title }}
          </div>
          <div class="flex gap-4 items-center">
            <div>
              {{ humanizeSize(item.file.size) }}
            </div>
            <div class="w-10">
              {{ formatPercentage(item.file.completedSize, item.file.size) }}
            </div>
            <div v-if="item.file.status === 'pending'" title="Pending">
              <Icon icon="lucide:clock" />
            </div>
            <div v-else-if="item.file.status === 'cancelled'" title="Cancelled by user">
              <Icon icon="lucide:ban" />
            </div>
            <div v-else-if="item.file.status === 'completed'" title="Transfer complete">
              <Icon icon="lucide:circle-check" />
            </div>
            <div v-else-if="item.file.status === 'error'" :title="item.file.error">
              <Icon icon="lucide:triangle-alert" />
            </div>
            <div v-else-if="item.file.status === 'progress'" title="Transfer in progress">
              <Icon icon="lucide:arrow-up-down" />
            </div>
          </div>
        </div>
        <div class="pl-2" v-else>
          {{ item.title }}
        </div>
      </FileTree>
    </div>
  </div>
  <EmptyDataPageContainer v-else>
    Transfer not found.
  </EmptyDataPageContainer>
</template>
<script lang="ts" setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { unwrapSingletonOrUndefined, pluralize, humanizeSize, formatPercentage, ensure } from "@quickbyte/common";
import { store } from "@/app-utils";
import { type TransferFileJob, showPathInFileManager, cancelTranferFile } from "@/core";
import { Icon } from '@iconify/vue';
import { showMenu } from "tauri-plugin-context-menu";
import EmptyDataPageContainer from "@/components/EmptyDataPageContainer.vue";
import PageHeader from "@/components/PageHeader.vue";
import FileTree from "@/components/FileTree.vue";
import TransferStatus from "@/components/TransferStatus.vue";

type ContextMenuOptions = Parameters<typeof showMenu>[0];

const route = useRoute();
const transfer = computed(() => store.transfers.value.find(t => t._id === unwrapSingletonOrUndefined(route.params.id)));

// TODO: we should have a 'Reveal in Finder' context menu for
// items for folder nodes too.

function showFileContextMenu(event: MouseEvent, fileJob: TransferFileJob) {
  event.preventDefault();
  
  const items: ContextMenuOptions["items"] = [{
    label: "Reveal in Finder",
    event: () => {
      return showPathInFileManager(fileJob.localPath)
    }
  }];

  if (fileJob.status === 'pending' || fileJob.status === 'progress') {
    const transferId = ensure(transfer.value?._id);
    items.push({
      label: 'Cancel file transfer',
      event: () => cancelTranferFile({
        transferId: transferId,
        fileId: fileJob._id
      })
    })
  }

  showMenu({
    items
  })
}
</script>