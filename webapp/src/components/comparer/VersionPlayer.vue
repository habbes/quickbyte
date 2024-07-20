<template>
  <div class="flex-1 flex flex-col">
    <div
      class="flex justify-between items-center px-4 py-2 border-r border-b border-black cursor-pointer transition-all ease-in-out"
      :class="{
        'border-b-blue-300': selected,
        'bg-[#1b1218]': selected,
        'shadow-sm': selected
      }"
      @click="$emit('select')"
    >
      <div class="flex items-center">
        <UiMenu>
          <template #trigger>
            <div class="mr-6 text-white flex items-center gap-1">
              <div>
                v{{ getVersionNumber(versionId) }}
              </div>
              <div>
                <ChevronDownIcon class="h-4 w-4" />
              </div>
            </div>
          </template>
          <UiMenuItem
            v-for="version in media.versions"
            :key="version._id"
            @click="$emit('changeVersion', version._id)"
          >
            <UiLayout horizontal gapSm itemsCenter fullWidth :title="version.name" class="overflow-hidden">
              <div class="text-gray-500">
                v{{ getVersionNumber(version._id) }}
              </div>
              <div
                class="overflow-hidden flex flex-1 items-center justify-between"
              >
                <div class="overflow-hidden whitespace-nowrap text-ellipsis">
                  {{ version.name }}
                </div>
                <div v-if="version._id === versionId">
                  <CheckIcon class="h-4 w-4" />
                </div>
              </div>
            </UiLayout>
          </UiMenuItem>
        </UiMenu>
        
        <div class="flex flex-col" v-if="version">
          <div class="text-xs">
            {{ version.name }}
          </div>
          <div class="text-[0.6rem]">
            {{ formatDateTime(version._createdAt) }}
          </div>
        </div>
      </div>
      <div>
        <div v-if="mediaType === 'video' || mediaType === 'audio'">
          <SpeakerWaveIcon v-if="selected" class="h-4 w-4 cursor-pointer"/>
          <SpeakerXMarkIcon v-else="isMuted" class="h-4 w-4 cursor-pointer"/>
        </div>
      </div>
    </div>
    <div class="flex-1 flex items-center">
      <BaseAVPlayer
        :style="`height: ${playerHeight}px`"
        v-if="media.file && (mediaType === 'video' || mediaType === 'audio')"
        ref="avPlayer"
        :mediaType="mediaType"
        :sources="sources"
        :comments="[]"
        :versionId="versionId"
        @heightChange="playerHeight = $event"
        hideControls
      />
      <ImageViewer
        v-else-if="file && mediaType === 'image'"
        :src="file.downloadUrl"
        class="h-[300px] sm:h-full"
        :comments="[]"
      />
      <div v-else class="h-[300px] sm:h-auto w-full flex items-center justify-center">
        Preview unsupported for this file type.
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed } from "vue";
import { getMediaType, getMimeTypeFromFilename } from "@quickbyte/common";
import type { MediaWithFileAndComments } from "@quickbyte/common";
import { formatDateTime } from "@/core";
import { BaseAVPlayer, ImageViewer } from "@/components/player";
import { UiMenu, UiMenuItem, UiLayout } from "@/components/ui";
import { CheckIcon, ChevronDownIcon, SpeakerXMarkIcon, SpeakerWaveIcon } from '@heroicons/vue/24/outline';

type MediaSource = {
  url: string;
  mimeType?: string;
  type: 'hls'|'dash'|'raw'
};

const props = defineProps<{
  media: MediaWithFileAndComments;
  versionId: string;
  selected: boolean;
}>();

const emit = defineEmits<{
  (e: 'changeVersion', versionId: string): unknown;
  (e: 'select'): unknown;
}>();

const playerHeight = ref<number>();
const version = computed(() => props.media.versions.find(v => v._id === props.versionId));
const file = computed(() => version.value?.file);

const mediaType = computed(() => {
  if (!props.media) return 'unknown';
  return getMediaType(props.media.file.name);
});

const sources = computed<MediaSource[]>(() => {
  if (!props.media) return [];
  if (!version.value?.file) return [];

  const file = version.value.file;

  const _src = [] as MediaSource[];
  if (file.hlsManifestUrl) {
    _src.push({
      url: file.hlsManifestUrl,
      type: 'hls'
    });
  }
  if (file.dashManifestUrl) {
    _src.push({
      url: file.dashManifestUrl,
      type: 'dash'
    });
  }
  if (file.downloadUrl) {
    _src.push({
      url: file.downloadUrl,
      mimeType: getMimeTypeFromFilename(file.name),
      type: 'raw'
    });
  }

  return _src;
});

function getVersionNumber(versionId: string) {
  return props.media.versions.findIndex(v => v._id === versionId) + 1;
}

</script>