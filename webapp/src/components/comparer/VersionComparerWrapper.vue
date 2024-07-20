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
        @playerStateChange="player1State = $event"
      />
      <VersionPlayer
        ref="player2"
        :media="media"
        :versionId="version2Id"
        :selected="!firstSelected"
        :volume="secondVolume"
        @changeVersion="setVersion2($event)"
        @select="firstSelected = false"
        @playerStateChange="player2State = $event"
      />
    </div>
    <!-- end side-by-side container -->
     <div v-if="mediaType === 'video' || mediaType === 'audio'">
      <PlaybackControls
        style="height: 60px"
        :playTime="currentPlayTime"
        :duration="duration"
        :isMuted="false"
        :isPlaying="isPlaying"
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
import { type AVPlayerState } from "@/components/player";

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
const selectedPlayer = computed(() => firstSelected.value ? player1.value : player2.value);
const player1State = ref<AVPlayerState>();
const player2State = ref<AVPlayerState>();
const volume = ref(0.5);
const firstVolume = computed(() => firstSelected.value ? volume.value : 0);
const secondVolume = computed(() => firstSelected.value ? 0 : volume.value);

// the duration is the larger of the two versions
const duration = computed(() =>
  Math.max(
    player1State.value?.duration || 0,
    player2State.value?.duration || 0
  ));

// Ideally both player's time should be synchronized.
// But they could go out of sync due to many reasons.
// We use the largest as the overall "current" time
// since it's more likely that the longer media will
// continue to play alone
const currentPlayTime = computed(() =>
  Math.max(
    player1State.value?.currentTime || 0,
    player2State.value?.currentTime || 0
  ));

const isPlaying = computed(() =>
  player1State.value?.isPlaying || player2State.value?.isPlaying || false);


// synchronize playing state
watch([() => player1State.value?.isPlaying, () => player2State.value?.isPlaying], 
  ([player1IsCurrentlyPlaying, player2IsCurrentlyPlaying],
    [player1WasPreviouslyPlaying, player2WasPreviouslyPlaying]) => {
  if (!player1State.value || !player2State.value) {
    return;
  }

  // if one player has paused playing before reaching the end, pause the other
  // player as well
  if (
    (player1WasPreviouslyPlaying && !player1IsCurrentlyPlaying && player1State.value.currentTime < player1State.value.duration)
  ) {
    player2.value?.pause();
  }

  if (player2WasPreviouslyPlaying && !player2IsCurrentlyPlaying && player2State.value.currentTime < player2State.value.duration) {
    player1.value?.pause();
  }

  // if one player has transition from pause to playing, then resume the other player as well
  if (!player1WasPreviouslyPlaying && player1IsCurrentlyPlaying && !player2IsCurrentlyPlaying && player2State.value.currentTime < player2State.value.duration) {
    player2.value?.play();
  }

  if (!player2WasPreviouslyPlaying && player2IsCurrentlyPlaying && !player1IsCurrentlyPlaying && player1State.value.currentTime < player1State.value.duration) {
    player1.value?.play();
  }
});

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
}

function pause() {
  players.forEach(p => p.value?.pause());
}
</script>