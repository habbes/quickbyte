<template>
  <FolderListItem :name="name" :numFiles="numFiles" :totalSize="totalSize">
    <template #icon>
      <span title="Remove folder">
        <XMarkIcon
          @click="$emit('remove')"
          class="h-6 w-6 cursor-pointer"
        />
      </span>
    </template>
  </FolderListItem>
</template>
<script lang="ts" setup>
import { XMarkIcon } from "@heroicons/vue/24/solid";
import FolderListItem from './FolderListItem.vue';

defineProps<{
  name: string;
  numFiles: number;
  totalSize: number;
}>();

defineEmits<{
  (e: 'remove'): unknown;
}>();
</script>