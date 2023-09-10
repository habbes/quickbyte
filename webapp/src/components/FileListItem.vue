<template>
  <DetailListItem>
    <template #default>
      {{ name }}
    </template>
    <template #detail>
      <DocumentIcon class="h-5 w-5"/>
      {{ getFileExtension(name) }} - {{ humanizeSize(size) }}
    </template>
    <template #icon>
      <slot name="icon"></slot>
    </template>
  </DetailListItem>
  </template>
  <script lang="ts" setup>
  import { getFileExtension, humanizeSize } from '@/core';
  import { DocumentIcon } from "@heroicons/vue/24/outline";
  import DetailListItem from './DetailListItem.vue';
  
  defineProps<{
    name: string;
    size: number;
  }>();
  </script>