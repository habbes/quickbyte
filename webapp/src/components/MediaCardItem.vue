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
    @share="$emit('share')"
    @toggleSelect="$emit('toggleSelect')"
    @toggleInMultiSelect="$emit('toggleInMultiSelect')"
    @selectAll="$emit('selectAll')"
    @unselectAll="$emit('unselectAll')"
  >
    <MediaTypeIcon :mediaType="mediaType" />
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
import { getMediaType } from '@/core/media-types';
import RenameMediaDialog from '@/components/RenameMediaDialog.vue';
import ProjectItemCardBase from './ProjectItemCardBase.vue';
import MediaTypeIcon from './MediaTypeIcon.vue';

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
  (e: 'share'): void;
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