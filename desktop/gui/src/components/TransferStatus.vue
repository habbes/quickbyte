<template>
  <div class="flex items-center gap-1 w-16" :title="statusMessage">
    <Icon :icon="icon" /> {{ formatPercentage(getTransferCompletedSize(transfer), transfer.totalSize ) }}
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";
import { type TransferJob, getTransferCompletedSize } from "@/core";
import { formatPercentage } from "@quickbyte/common";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  transfer: TransferJob
}>();

const icon = computed(() =>
  props.transfer.status === 'pending' ? 'lucide:hourglass'
  : props.transfer.status === 'error' ? 'lucide:triangle-alert'
  : props.transfer.status === 'cancelled' ? 'lucide:circle-off'
  : props.transfer.type === 'download' ? 'lucide:arrow-down'
  : props.transfer.type === 'upload' ? 'lucide:arrow-up'
  : 'lucide:triangle-alert');

const statusMessage = computed(() =>
  props.transfer.status === 'error' ? props.transfer.error || 'Error occurred during transfer.'
  : props.transfer.status === 'pending' ? `The ${props.transfer.type} has been queued.`
  :  '');
</script>