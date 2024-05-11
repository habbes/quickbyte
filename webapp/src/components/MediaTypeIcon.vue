<template>
  <PlayIcon v-if="mediaType === 'video'" :class="classes"/>
  <PhotoIcon v-else-if="mediaType === 'image'" :class="classes"/>
  <MusicalNoteIcon v-else-if="mediaType === 'audio'" :class="classes"/>
  <FolderIcon v-else-if="mediaType === 'folder'" :class="classes" />
  <DocumentIcon v-else :class="classes"/>
</template>
<script lang="ts" setup>
import type { MediaType } from "@/core/media-types";
import { PlayIcon, PhotoIcon, MusicalNoteIcon, DocumentIcon, FolderIcon } from "@heroicons/vue/24/solid";
import { computed } from "vue";

const props = defineProps<{
  mediaType: MediaType|'folder';
  sm?: boolean;
}>();

const classes = computed(() => {
  return {
    'h-10 w-10': !props.sm,
    'h-6 w-6': props.sm
  }
});

</script>