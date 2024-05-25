<template>
  <ProjectItemCardBase
    :id="media._id"
    :name="media.name"
    :link="{ name: 'project-share-player', params: { shareId: shareId, code: shareCode, mediaId: media._id } }"
    :selected="selected"
    :showSelectCheckbox="showSelectCheckbox"
    :totalSelectedItems="totalSelectedItems"
    @toggleSelect="$emit('toggleSelect')"
    @toggleInMultiSelect="$emit('toggleInMultiSelect')"
    @selectAll="$emit('selectAll')"
    @unselectAll="$emit('unselectAll')"
  >
    <div
      class="relative flex flex-1 items-center justify-center h-full w-full"
    >
      <div
        v-if="media.thumbnailUrl"
        class="absolute top-0 left-0 right-0 bottom-0 bg-no-repeat bg-center bg-contain"
        :style="{
          backgroundImage: `url(${media.thumbnailUrl})`
        }"
      >
      </div>
      <div
        class="relative flex flex-1 items-center justify-center h-full w-full"
      >
        <MediaTypeIcon class="text-[#ccd1e7]" :mediaType="mediaType" />
      </div>
    </div>

    <template #extraDetails>
      <div v-if="showAllVersions && media.versions.length > 1">
        {{ media.versions.length }} versions
      </div>
    </template>
    <template #menuItems>
      <ProjectShareItemMenuItems
        :totalSelectedItems="totalSelectedItems"
        :allowDownload="allowDownload"
        @download="$emit('download')"
      />
    </template>
  </ProjectItemCardBase>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Media, WithThumbnail } from '@quickbyte/common';
import { getMediaType } from '@/core/media-types';
import ProjectItemCardBase from '@/components/ProjectItemCardBase.vue';
import ProjectShareItemMenuItems from './ProjectShareItemMenuItems.vue';
import MediaTypeIcon from '@/components/MediaTypeIcon.vue';

const props = defineProps<{
  media: WithThumbnail<Media>,
  shareId: string;
  shareCode: string;
  selected?: boolean;
  showSelectCheckbox?: boolean;
  totalSelectedItems?: number;
  allowDownload?: boolean;
  showAllVersions?: boolean;
}>();

defineEmits<{
  (e: 'download'): void;
  (e: 'toggleSelect'): void;
  (e: 'toggleInMultiSelect'): void;
  (e: 'selectAll'): void;
  (e: 'unselectAll'): void;
}>();

const mediaType = computed(() => getMediaType(props.media.name));
</script>