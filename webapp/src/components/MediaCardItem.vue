<template>
  <ProjectItemCardBase
    :id="media._id"
    :name="media.name"
    :link="{ name: 'player', params: { projectId: media.projectId, mediaId: media._id } }"
    :selected="selected"
    :showSelectCheckbox="showSelectCheckbox"
    :totalSelectedItems="totalSelectedItems"
    @rename="rename()"
    @delete="$emit('delete', media._id)"
    @move="$emit('move')"
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
      <div>
        {{ new Date(media._createdAt).toLocaleDateString() }}
      </div>
      <div v-if="media.versions.length > 1">
        {{ media.versions.length }} versions
      </div>
    </template>
  </ProjectItemCardBase>
  <RenameMediaDialog
    ref="renameDialog"
    :media="media"
    @rename="$emit('update', $event)"
  />
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Media } from '@/core';
import { DocumentIcon, PlayIcon, PhotoIcon, MusicalNoteIcon } from '@heroicons/vue/24/solid';
import { getMediaType } from '@/core/media-types';
import RenameMediaDialog from '@/components/RenameMediaDialog.vue';
import ProjectItemCardBase from './ProjectItemCardBase.vue';

const props = defineProps<{
  media: Media,
  selected?: boolean,
  showSelectCheckbox?: boolean,
  totalSelectedItems?: number,
}>();

defineEmits<{
  (e: 'update', updatedMedia: Media): void;
  (e: 'delete', mediaId: string): void;
  (e: 'move'): void;
  (e: 'toggleSelect'): void;
  (e: 'toggleInMultiSelect'): void;
  (e: 'selectAll'): void;
  (e: 'unselectAll'): void;
}>();

const renameDialog = ref<typeof RenameMediaDialog>();
const mediaType = computed(() => getMediaType(props.media.name));

function rename() {
  renameDialog.value?.open();
}

</script>