<template>
  <div class="h-full w-full flex flex-col border border-[#615d6e] rounded-md">
    <router-link
      :to="{ name: 'player', params: { projectId: media.projectId, mediaId: media._id } }"
      class="h-full w-full flex flex-col"
    >
      <div class="flex-1 bg-black flex items-center justify-center">
        <FilmIcon v-if="mediaType === 'video'" class="h-10 w-10"/>
        <PhotoIcon v-else-if="mediaType === 'image'" class="h-10 w-10"/>
        <MusicalNoteIcon v-else-if="mediaType === 'audio'" class="h-10 w-10"/>
        <DocumentIcon v-else class="h-10 w-10"/>
      </div>
      <div class="h-12 bg-[#615d6e] flex flex-row items-center p-2 text-white">
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