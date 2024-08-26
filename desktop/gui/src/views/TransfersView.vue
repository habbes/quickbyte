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
        @dblclick="goToTransfer(transfer._id)"
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
          {{ formatPercentage(getTransferCompletedSize(transfer), transfer.totalSize, 1) }}
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from "vue-router";
import { store } from "@/app-utils";
import { humanizeSize, formatPercentage } from "@quickbyte/common";
import { getTransferCompletedSize } from "@/core";

const router = useRouter();
const transfers = store.transfers;

function goToTransfer(id: string) {
  router.push({ name: 'transfer', params: { id } });
}
</script>