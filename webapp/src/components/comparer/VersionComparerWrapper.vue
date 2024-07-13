<template>
  <div class="flex flex-col fixed top-0 bottom-0 left-0 right-0 z-50 bg-[#261922]">
    <!-- header -->
    <VersionComparerHeader
      @close="closeComparison()"
      :title="media.name"
    />
    <!-- end header -->
    <!-- container -->
    <div class="flex h-[calc(100dvh-48px)] relative">
      <VersionPlayer
        :media="media"
        :versionId="version1Id"
        @changeVersion="setVersion1($event)"
      />
      <VersionPlayer
        :media="media"
        :versionId="version2Id"
        @changeVersion="setVersion2($event)"
      />
    </div>
    <!-- container -->
  </div>
</template>
<script lang="ts" setup>
import { ref, computed } from "vue";
import { getMediaType, getMimeTypeFromFilename, type MediaWithFileAndComments } from "@quickbyte/common";
import { XMarkIcon, CheckIcon, ChevronDownIcon } from '@heroicons/vue/24/outline';
import VersionComparerHeader from './VersionComparerHeader.vue';
import VersionPlayer from './VersionPlayer.vue';
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
  (e: 'changeVersions', version1Id: string, version2Id: string): unknown;
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

function setVersion1(id: string) {
  emit('changeVersions', id, props.version2Id);
}

function setVersion2(id: string) {
  emit('changeVersions', props.version1Id, id);
}
</script>