<template>
  <ProjectItemCardBase
    :id="media._id"
    :name="media.name"
    @rename="rename()"
    @delete="deleteMedia()"
  >
    <router-link
      :to="{ name: 'player', params: { projectId: media.projectId, mediaId: media._id } }"
      class="flex-1 bg-[#1c1b26] flex items-center justify-center"
    >
      <PlayIcon v-if="mediaType === 'video'" class="h-10 w-10"/>
      <PhotoIcon v-else-if="mediaType === 'image'" class="h-10 w-10"/>
      <MusicalNoteIcon v-else-if="mediaType === 'audio'" class="h-10 w-10"/>
      <DocumentIcon v-else class="h-10 w-10"/>
    </router-link>
    <template #title>
      <router-link
        :to="{ name: 'player', params: { projectId: media.projectId, mediaId: media._id } }"
      >
        {{ media.name }}
      </router-link>
    </template>
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
  <DeleteMediaDialog
    ref="deleteDialog"
    :media="media"
    @delete="$emit('delete', $event)"
  />
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Media } from '@/core';
import { DocumentIcon, PlayIcon, PhotoIcon, MusicalNoteIcon } from '@heroicons/vue/24/solid';
import { getMediaType } from '@/core/media-types';
import RenameMediaDialog from '@/components/RenameMediaDialog.vue';
import DeleteMediaDialog from '@/components/DeleteMediaDialog.vue';
import ProjectItemCardBase from './ProjectItemCardBase.vue';

const props = defineProps<{
  media: Media
}>();

defineEmits<{
  (e: 'update', updatedMedia: Media): void;
  (e: 'delete', mediaId: string): void;
}>();

const renameDialog = ref<typeof RenameMediaDialog>();
const deleteDialog = ref<typeof DeleteMediaDialog>();
const mediaType = computed(() => getMediaType(props.media.name));

function rename() {
  renameDialog.value?.open();
}

function deleteMedia() {
  deleteDialog.value?.open();
}
</script>