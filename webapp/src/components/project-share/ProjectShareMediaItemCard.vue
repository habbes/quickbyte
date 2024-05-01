<template>
  <ProjectItemCardBase
    :id="media._id"
    :name="media.name"
    :link="{ name: 'player', params: { projectId: media.projectId, mediaId: media._id } }"
    :selected="selected"
    :showSelectCheckbox="showSelectCheckbox"
    :totalSelectedItems="totalSelectedItems"
    @toggleSelect="$emit('toggleSelect')"
    @toggleInMultiSelect="$emit('toggleInMultiSelect')"
    @selectAll="$emit('selectAll')"
    @unselectAll="$emit('unselectAll')"
  >
    <PlayIcon v-if="mediaType === 'video'" class="h-10 w-10"/>
    <PhotoIcon v-else-if="mediaType === 'image'" class="h-10 w-10"/>
    <MusicalNoteIcon v-else-if="mediaType === 'audio'" class="h-10 w-10"/>
    <DocumentIcon v-else class="h-10 w-10"/>
    <template #extraDetails>
      <div v-if="showAllVersions && media.versions.length > 1">
        {{ media.versions.length }} versions
      </div>
    </template>
    <template #menuItems>
      <ProjectShareItemMenuItems
        :totalSelectedItems="totalSelectedItems"
        @download="$emit('download')"
      />
    </template>
  </ProjectItemCardBase>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Media } from '@/core';
import { DocumentIcon, PlayIcon, PhotoIcon, MusicalNoteIcon } from '@heroicons/vue/24/solid';
import { getMediaType } from '@/core/media-types';
import ProjectItemCardBase from '@/components/ProjectItemCardBase.vue';
import ProjectShareItemMenuItems from './ProjectShareItemMenuItems.vue';

const props = defineProps<{
  media: Media,
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