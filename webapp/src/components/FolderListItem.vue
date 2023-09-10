<template>
  <DetailListItem>
    <template #default>
      {{ name }}
    </template>
    <template #detail>
      <FolderIcon class="h-5 w-5"/> {{ numFiles }} files - {{ humanizeSize(totalSize) }}
    </template>
    <template #icon>
      <slot name="icon"></slot>
    </template>
  </DetailListItem>
</template>
<script lang="ts" setup>
import { humanizeSize } from '@/core';
import { FolderIcon } from "@heroicons/vue/24/outline";
import DetailListItem from './DetailListItem.vue';

defineProps<{
  name: string;
  numFiles: number;
  totalSize: number;
}>();
</script>