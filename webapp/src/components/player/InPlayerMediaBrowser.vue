<template>
  <div class="h-full px-4 py-2 gap-2 flex flex-col mb-6">
    <div
      v-for="item in items"
    >
      <ProjectItemCardBase
        :name="item.name"
        :selected="item._id === selectedItemId"
        @click="$emit('itemClick', item)"
      >
        <div class="h-[100px] flex items-center justify-center">
          <MediaTypeIcon sm :mediaType="getMediaType(item)" />
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


defineProps<{
  items: T[];
  selectedItemId?: string;
  getMediaType: (item: T) => MediaType | 'folder';
}>();

defineEmits<{
  (e: 'itemClick', item: T): unknown;
}>();
</script>