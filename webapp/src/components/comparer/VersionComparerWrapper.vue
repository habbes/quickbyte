<template>
  <div class="flex flex-col fixed top-0 bottom-0 left-0 right-0 z-50 bg-[#261922]">
    <!-- header -->
    <VersionComparerHeader
      @close="closeComparison()"
      :title="media.name"
    />
    <!-- end header -->
    <!-- container -->
    <div class="flex-1 flex">
      <div class="flex-1 flex flex-col">
        <div class="flex items-center px-4 py-2 border border-black" v-if="v1">
          <UiMenu>
            <template #trigger>
              <div class="mr-6 text-white flex items-center gap-1">
                <div>
                  v{{ getVersionNumber(v1._id) }}
                </div>
                <div>
                  <ChevronDownIcon class="h-4 w-4" />
                </div>
              </div>
            </template>
            <UiMenuItem
              v-for="version in media.versions"
              :key="version._id"
            >
              <UiLayout horizontal gapSm itemsCenter fullWidth :title="version.name" class="overflow-hidden">
                <div class="text-gray-500" :class="{ 'font-bold': version._id === version1Id }">
                  v{{ getVersionNumber(version._id) }}
                </div>
                <div
                  class="overflow-hidden flex flex-1 items-center justify-between"
                  :class="{ 'font-bold': version._id === version1Id }"
                >
                  <div class="overflow-hidden whitespace-nowrap text-ellipsis">
                    {{ version.name }}
                  </div>
                  <div v-if="version._id === version1Id">
                    <CheckIcon class="h-4 w-4" />
                  </div>
                </div>
              </UiLayout>
            </UiMenuItem>
          </UiMenu>
         
          <div class="flex flex-col">
            <div class="text-xs">
              {{ v1.name }}
            </div>
            <div class="text-[0.6rem]">
              {{ formatDateTime(v1._createdAt) }}
            </div>
          </div>
        </div>
        <div class="flex-1 flex items-center bg-black">
          <AVPlayer
            :style="`height: ${playerHeight}px`"
            v-if="media.file && (mediaType === 'video' || mediaType === 'audio')"
            ref="avPlayer"
            :mediaType="mediaType"
            :sources="sources"
            :comments="[]"
            :versionId="version1Id"
            @heightChange="playerHeight = $event"
          />
        </div>
      </div>
      <div class="flex-1">
        <div>
          test
        </div>
        <AVPlayer
          :style="`height: ${playerHeight}px`"
          v-if="media.file && (mediaType === 'video' || mediaType === 'audio')"
          ref="avPlayer"
          :mediaType="mediaType"
          :sources="sources"
          :comments="[]"
          :versionId="version1Id"
          @heightChange="playerHeight = $event"
        />
      </div>
    </div>
    <!-- container -->
  </div>
</template>
<script lang="ts" setup>
import { ref, computed } from "vue";
import { getMediaType, getMimeTypeFromFilename, type MediaWithFileAndComments } from "@quickbyte/common";
import { XMarkIcon, CheckIcon, ChevronDownIcon } from '@heroicons/vue/24/outline';
import VersionComparerHeader from './VersionComparerHeader.vue';
import AVPlayer from '@/components/player/AVPlayer.vue';
import { UiMenu, UiMenuItem, UiLayout } from "@/components/ui";
import { formatDateTime } from "@/core";

type MediaSource = {
  url: string;
  mimeType?: string;
  type: 'hls'|'dash'|'raw'
};

const props = defineProps<{
  media: MediaWithFileAndComments,
  version1Id: string;
  version2Id: string;
}>()

const emit = defineEmits<{
  (e: 'close'): unknown;
}>();

const playerHeight = ref<number>();
const v1 = computed(() => props.media.versions.find(v => v._id === props.version1Id));
const v2 = computed(() => props.media.versions.find(v => v._id === props.version2Id));

const mediaType = computed(() => {
  if (!props.media) return 'unknown';
  return getMediaType(props.media.file.name);
});

const sources = computed<MediaSource[]>(() => {
  if (!props.media) return [];
  if (!v1.value?.file) return [];

  const file = v1.value.file;

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

function closeComparison() {
  emit('close');
}
</script>