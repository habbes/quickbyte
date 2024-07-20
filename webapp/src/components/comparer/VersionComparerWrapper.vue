<template>
  <div class="flex flex-col fixed top-0 bottom-0 left-0 right-0 z-50 bg-[#261922]">
    <!-- header -->
    <VersionComparerHeader
      @close="closeComparison()"
      :title="media.name"
    />
    <!-- end header -->
    <!-- side-by-side container -->
    <div class="flex h-[calc(100dvh-108px)] relative">
      <VersionPlayer
        ref="player1"
        :media="media"
        :versionId="version1Id"
        :selected="firstSelected"
        :volume="firstVolume"
        @changeVersion="setVersion1($event)"
        @select="firstSelected = true"
      />
      <VersionPlayer
        ref="player2"
        :media="media"
        :versionId="version2Id"
        :selected="!firstSelected"
        :volume="secondVolume"
        @changeVersion="setVersion2($event)"
        @select="firstSelected = false"
      />
    </div>
    <!-- end side-by-side container -->
     <div v-if="mediaType === 'video' || mediaType === 'audio'">
      <PlaybackControls
        style="height: 60px"
        :playTime="0"
        :duration="1"
        :isMuted="false"
        :isPlaying="false"
        :allowFullScreen="false"
        v-model:volume="volume"
        @play="play()"
        @pause="pause()"
      />
     </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { getMediaType, type MediaWithFileAndComments, type MediaType } from "@quickbyte/common";
import VersionComparerHeader from './VersionComparerHeader.vue';
import VersionPlayer from './VersionPlayer.vue';
import PlaybackControls from "./PlaybackControls.vue";

const props = defineProps<{
  media: MediaWithFileAndComments,
  version1Id: string;
  version2Id: string;
}>()

const emit = defineEmits<{
  (e: 'close'): unknown;
  (e: 'changeVersions', version1Id: string, version2Id: string): unknown;
}>();

const mediaType = computed<MediaType>(() => {
  const files = [props.version1Id, props.version2Id].flatMap(vId =>
    props.media.versions.filter(v => v._id === vId).map(v => v.file))

  // Ideally all versions of the same media should be the same type.
  // But nothing stops the users from having different media types.
  // If at least one of the versions is a video, let's consider
  // this a video, otherwise if one's audio, let's consider it audio, etc.
  return files.find(f =>  getMediaType(f.name) === 'video') ? 'video'
    : files.find(f => getMediaType(f.name) === 'audio') ? 'audio'
    : files.find(f => getMediaType(f.name) === 'image') ? 'image'
    : 'unknown';
});

const firstSelected = ref(true);
const player1 = ref<typeof VersionPlayer>();
const player2 = ref<typeof VersionPlayer>();
const players = [player1, player2];
const isPlaying = ref(false);
const selectedPlayer = computed(() => firstSelected.value ? player1.value : player2.value);
const volume = ref(0.5);
const firstVolume = computed(() => firstSelected.value ? volume.value : 0);
const secondVolume = computed(() => firstSelected.value ? 0 : volume.value);

watch(volume, () => {
  console.log('volume changed', volume.value);
})

function closeComparison() {
  emit('close');
}

function setVersion1(id: string) {
  emit('changeVersions', id, props.version2Id);
}

function setVersion2(id: string) {
  emit('changeVersions', props.version1Id, id);
}

function play() {
  players.forEach(p => p.value?.play());
  isPlaying.value = true;
}

function pause() {
  players.forEach(p => p.value?.pause());
  isPlaying.value = false;
}
</script>