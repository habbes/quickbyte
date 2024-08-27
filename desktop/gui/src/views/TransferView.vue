<template>
  <div v-if="transfer">
    <PageHeader>
      <div class="h-full flex-1 flex items-center text-sm justify-between">
        <div class="flex gap-2 items-center">
          <router-link :to="{ name: 'transfers' }" title="Go back" class="hover:text-white">
            <Icon icon="lucide:arrow-left" />
          </router-link>
          <div>
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
          <div>
            {{ formatPercentage(getTransferCompletedSize(transfer), transfer.totalSize ) }}
          </div>
        </div>
      </div>
    </PageHeader>
    <div>
      <FileTree
        :files="transfer.files"
        v-slot="{ item }"
      >
        <div class="flex flex-1 w-full justify-between items-center" v-if="item.file">
          <div>
            {{ item.title }}
          </div>
          <div class="flex gap-2 items-center">
            <div>
              {{ humanizeSize(item.file.size) }}
            </div>
            <div>
              {{ formatPercentage(item.file.completedSize, item.file.size) }}
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
import { unwrapSingletonOrUndefined, pluralize, humanizeSize, formatPercentage } from "@quickbyte/common";
import { getTransferCompletedSize } from "@/core";
import { store } from "@/app-utils";
import { Icon } from '@iconify/vue';
import EmptyDataPageContainer from "@/components/EmptyDataPageContainer.vue";
import PageHeader from "@/components/PageHeader.vue";
import FileTree from "@/components/FileTree.vue";

const route = useRoute();
const transfer = computed(() => store.transfers.value.find(t => t._id === unwrapSingletonOrUndefined(route.params.id)));
</script>