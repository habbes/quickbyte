<template>
  <div class="h-full px-4 py-2 gap-2 flex flex-col mb-2">
    <div
      @click="$emit('goToParent')"
      v-if="hasParentFolder"
      class="flex gap-2 items-center cursor-pointer text-sm hover:text-white"
    >
      <ArrowUpOnSquareIcon class="h-4 w-4" />
      <span>Move to parent folder</span>
    </div>
    <div
      v-for="item in items"
      :key="item._id"
      :id="getItemHtmlId(item._id)"
    >
      <ProjectItemCardBase
        :name="item.name"
        :selected="item._id === selectedItemId"
        @click="$emit('itemClick', item)"
      >
        <div class="h-[100px] flex items-center justify-center">
          <div
            v-if="getThumbnail(item)"
            class="absolute top-0 left-0 right-0 bottom-0 bg-no-repeat bg-center bg-contain"
            :style="{
              backgroundImage: `url(${getThumbnail(item)})`
            }"
          >
          </div>
          <div
            class="relative flex flex-1 items-center justify-center h-full w-full"
          >
            <MediaTypeIcon class="text-[#ccd1e7]" sm :mediaType="getMediaType(item)" />
          </div>
        </div>
        <template #footer>
          <div class="flex items-center px-2 py-1 border-t border-t-[#5e5e8b] cursor-pointer">
            {{ item.name }}
          </div>
        </template>
      </ProjectItemCardBase>
    </div>
  </div>
</template>
<script lang="ts" setup generic="T extends { type: 'folder'|'media', name: string, _id: string }">
import type { MediaType } from '@/core/media-types';
import ProjectItemCardBase from "../ProjectItemCardBase.vue";
import MediaTypeIcon from '../MediaTypeIcon.vue';
import { ArrowUpOnSquareIcon } from "@heroicons/vue/24/outline";
import { computed, nextTick, watch } from 'vue';

const props = defineProps<{
  items: T[];
  selectedItemId?: string;
  getMediaType: (item: T) => MediaType | 'folder';
  getThumbnail: (item: T) => string|undefined;
  hasParentFolder: boolean;
}>();

defineEmits<{
  (e: 'itemClick', item: T): unknown;
  (e: 'goToParent'): unknown;
}>();

function getItemHtmlId(itemId: string) {
  return `mediaBrowserItem_${itemId}`;
}

watch(() => props.selectedItemId, () => {
  nextTick(() => {
    if (!props.selectedItemId) return;
    document.querySelector(`#${getItemHtmlId(props.selectedItemId)}`)?.scrollIntoView({
      block: 'end',
      inline: 'nearest',
      behavior: 'smooth'
    });
  });
}, { immediate: true });
</script>