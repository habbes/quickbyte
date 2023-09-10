<template>
  <FileListItem :name="name" :size="size">
    <template v-slot:icon>
      <span title="Remove file">
        <XMarkIcon
          @click="$emit('remove')"
          class="h-6 w-6 cursor-pointer"
        />
      </span>
    </template>
  </FileListItem>
</template>
<script lang="ts" setup>
import { XMarkIcon } from "@heroicons/vue/24/solid";
import FileListItem from './FileListItem.vue';

defineProps<{
  name: string;
  size: number;
}>();

defineEmits<{
  (e: 'remove'): () => unknown;
}>();
</script>