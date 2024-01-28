<template>
  <div class="h-full w-full flex flex-col border border-[#5e5e8b] rounded-sm">
    <router-link
      :to="{ name: 'player', params: { projectId: media.projectId, mediaId: media._id } }"
      class="h-full w-full flex flex-col"
    >
      <div class="flex-1 bg-[#1c1b26] flex items-center justify-center">
        <FilmIcon v-if="mediaType === 'video'" class="h-10 w-10"/>
        <PhotoIcon v-else-if="mediaType === 'image'" class="h-10 w-10"/>
        <MusicalNoteIcon v-else-if="mediaType === 'audio'" class="h-10 w-10"/>
        <DocumentIcon v-else class="h-10 w-10"/>
      </div>
      <div
        class="h-12 border-t border-t-[#5e5e8b] bg-[#38364e] flex flex-row items-center p-2 text-white overflow-hidden"
        :title="media.name"
      >
          {{ media.name }}
      </div>
    </router-link>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Media } from '@/core';
import { DocumentIcon, FilmIcon, PhotoIcon, MusicalNoteIcon } from '@heroicons/vue/24/solid';
import { getMediaType } from '@/core/media-types';

const props = defineProps<{
  media: Media
}>();

const mediaType = computed(() => getMediaType(props.media.name));
</script>