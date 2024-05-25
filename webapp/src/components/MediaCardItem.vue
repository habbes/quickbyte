<template>
  <ProjectItemCardBase
    :id="media._id"
    :name="media.name"
    :link="{ name: 'player', params: { projectId: media.projectId, mediaId: media._id } }"
    :selected="selected"
    :showSelectCheckbox="showSelectCheckbox"
    :totalSelectedItems="totalSelectedItems"
    :hasVersionManagement="true"
    @rename="rename()"
    @manageVersions="manageVersions()"
    @delete="$emit('delete', media._id)"
    @move="$emit('move')"
    @share="$emit('share')"
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
  <MediaVersionsDialog
    ref="mediaVersionsDialog"
    :media="media"
    @update="$emit('update', $event)"
    :allowUpload="allowUpload"
  />
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Media, WithThumbnail } from '@quickbyte/common';
import { getMediaType } from '@/core/media-types';
import RenameMediaDialog from '@/components/RenameMediaDialog.vue';
import { MediaVersionsDialog } from "@/components/versions";
import ProjectItemCardBase from './ProjectItemCardBase.vue';
import MediaTypeIcon from './MediaTypeIcon.vue';

const props = defineProps<{
  media: WithThumbnail<Media>,
  selected?: boolean,
  showSelectCheckbox?: boolean,
  totalSelectedItems?: number,
  allowUpload?: boolean;
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
const mediaVersionsDialog = ref<typeof MediaVersionsDialog>();
const mediaType = computed(() => getMediaType(props.media.name));

function rename() {
  renameDialog.value?.open();
}

function manageVersions() {
  mediaVersionsDialog.value?.open();
}
</script>