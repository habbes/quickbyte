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
          <router-link
            :to="{ name: 'player', params: { projectId: media.projectId, mediaId: media._id } }"
          >
            {{ media.name }}
          </router-link>
        </div>
        <div>
          <UiMenu>
            <template #trigger>
              <EllipsisVerticalIcon class="h-5 w-5"/>
            </template>
            <UiMenuItem @click="rename()">
              <UiLayout horizontal itemsCenter gapSm>
                <PencilIcon class="w-4 h-4"/>
                <span>Rename</span>
              </UiLayout>
            </UiMenuItem>
            <UiMenuItem @click="deleteMedia()">
              <UiLayout horizontal itemsCenter gapSm>
                <TrashIcon class="w-4 h-4"/>
                <span>Delete</span>
              </UiLayout>
            </UiMenuItem>
          </UiMenu>
          
        </div>
      </div>
    </div>
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
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Media } from '@/core';
import { DocumentIcon, FilmIcon, PhotoIcon, MusicalNoteIcon, EllipsisVerticalIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/solid';
import { getMediaType } from '@/core/media-types';
import { UiMenu, UiMenuItem, UiLayout } from '@/components/ui';
import RenameMediaDialog from '@/components/RenameMediaDialog.vue';
import DeleteMediaDialog from '@/components/DeleteMediaDialog.vue';

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