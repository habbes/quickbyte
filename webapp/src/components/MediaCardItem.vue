<template>
  <div class="h-full w-full flex flex-col border border-[#5e5e8b] rounded-sm">
    <div
      
      class="h-full w-full flex flex-col"
    >
      <router-link
        :to="{ name: 'player', params: { projectId: media.projectId, mediaId: media._id } }"
        class="flex-1 bg-[#1c1b26] flex items-center justify-center"
      >
        <FilmIcon v-if="mediaType === 'video'" class="h-10 w-10"/>
        <PhotoIcon v-else-if="mediaType === 'image'" class="h-10 w-10"/>
        <MusicalNoteIcon v-else-if="mediaType === 'audio'" class="h-10 w-10"/>
        <DocumentIcon v-else class="h-10 w-10"/>
      </router-link>
      <div
        class="h-12 border-t border-t-[#5e5e8b] bg-[#38364e] flex justify-between flex-row items-center p-2 text-white overflow-hidden"
        :title="media.name"
      >
        <div class="flex-1 text-ellipsis">
          {{ media.name }}
        </div>
        <div>
          <UiMenu>
            <template #trigger>
              <EllipsisVerticalIcon class="h-5 w-5"/>
            </template>
            <UiMenuItem>
              <UiLayout horizontal itemsCenter gapSm>
                <PencilIcon class="w-4 h-4"/>
                <span>Rename</span>
              </UiLayout>
            </UiMenuItem>
            <UiMenuItem>
              <UiLayout horizontal itemsCenter gapSm>
                <TrashIcon class="h-4 w-4" />
                <span>Delete</span>
              </UiLayout>
            </UiMenuItem>
          </UiMenu>
          
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Media } from '@/core';
import { DocumentIcon, FilmIcon, PhotoIcon, MusicalNoteIcon, EllipsisVerticalIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/solid';
import { getMediaType } from '@/core/media-types';
import { UiMenu, UiMenuItem, UiLayout } from '@/components/ui';

const props = defineProps<{
  media: Media
}>();

const mediaType = computed(() => getMediaType(props.media.name));
</script>