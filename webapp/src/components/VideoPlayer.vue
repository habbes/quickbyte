<template>
  <div>
    <video
      ref="player"
      :src="src"
      controlslist="nodownload"
      @seeked="$emit('seeked')"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @timeupdate="handleTimeUpdate()"
      @canplay="handleCanPlay()"
    ></video>
    <div
      ref="progressBar"
      class="relative h-2 border-x-[0.5px] border-x-black cursor-pointer"
      
      @mouseenter="handleProgressBarMouseEnter($event)"
      @mousemove="handleProgressBarMouseMove($event)"
      @mouseleave="handleProgressBarMouseLeave()"
      @click="handleProgressBarClick($event)"
    >
      <div class="absolute h-2 w-full bg-[#24141f]"></div>
      <div class="absolute h-2 bg-blue-400" :style="{ width: `${playPercentage}%`}"></div>
      <div v-if="seekingHoverPosition !== undefined" class="absolute h-2 w-[2px] bg-white" :style="{ left: `${seekingHoverPosition}px`}"></div>
      <div
        v-if="seekingHoverTime !== undefined"
        class="absolute top-[-40px] text-white px-10 py-1 bg-gray-700 opacity-70 rounded-md translate-x-[-50%] z-10"
        :style="{ left: `${seekingHoverPosition}px`}"
      >
        {{ formatTimestampDuration(seekingHoverTime) }}
      </div>

    </div>
    <div class="bg-black border-t border-t-[#24141f] p-2 flex flex-row items-center gap-2">
      <div>
        <PlayIcon v-if="!isPlaying" class="h-5 w-5 cursor-pointer" @click="play()"/>
        <PauseIcon v-else class="h-5 w-5 cursor-pointer" @click="pause()"/>
      </div>
      <div>
        <SpeakerWaveIcon v-if="!isMuted" class="h-5 w-5 cursor-pointer" @click="mute()"/>
        <SpeakerXMarkIcon v-if="isMuted" class="h-5 w-5 cursor-pointer" @click="unmute()"/>
      </div>
      <div>
        <input v-model="volume" type="range" min="0" max="1" step="0.01" class="range bg-white range-xs" /> 
      </div>
      <div>
        {{ formatTimestampDuration(playTime) }} / {{ formatTimestampDuration(duration) }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { formatTimestampDuration, type Comment } from '@/core';
import { ref, computed, watch } from 'vue';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/vue/24/solid';

const player = ref<HTMLVideoElement>();
const progressBar = ref<HTMLDivElement>();
const isPlaying = ref(false);
const playTime = ref(0);
const playPercentage = computed(() => {
  if (!player.value) return 0;
  const current = playTime.value;
  const total = player.value.duration;
  return 100 * current/total;
});
// When the video player is mounted,
// the duration is NaN
// So we update the duration manually
// when canplay event has been triggered.
const duration = ref(0);
const isMuted = ref(false);
const volume = ref(0);
const prevVolume = ref(0);

watch([volume], (curr, prev) => {
  if (!player.value) return;
  player.value.volume = volume.value;
  prevVolume.value = prev[0];
  if (volume.value == 0.0) {
    isMuted.value = true;
  }
});

const seekingHoverPosition = ref<number|undefined>(undefined);
const seekingHoverTime = computed<number|undefined>(() => {
  if (seekingHoverPosition.value === undefined) return;
  return getTimeFromPosition(seekingHoverPosition.value);
});

defineProps<{
  src: string;
  comments?: Comment[];
}>();

defineEmits<{
  (e: 'seeked'): void;
}>();

defineExpose({
  seek,
  pause,
  play,
  getCurrentTime
});

function seek(to: number) {
  if (!player.value) return;
  player.value.currentTime = to;
}

function pause() {
  player.value?.pause();
}

function play() {
  player.value?.play();
}

function mute() {
  if (!player.value) return;
  player.value.muted = true;
  isMuted.value = true;
  volume.value = 0;
}

function unmute() {
  if (!player.value) return;
  player.value.muted = false;
  isMuted.value = false;
  volume.value = prevVolume.value;
}

function getCurrentTime(): number {
  if (!player.value) return 0;
  return player.value.currentTime;
}

function handleTimeUpdate() {
  if (!player.value) return;
  playTime.value = player.value.currentTime;
}

function handleProgressBarClick(event: MouseEvent) {
  console.log('click');
  const mouseX = event.offsetX;
  console.log('click offset', event.offsetX);
  const newTime = getTimeFromPosition(mouseX);
  console.log('seek to', newTime);
  return seek(newTime);
}

function handleProgressBarMouseEnter(event: MouseEvent) {
  if (!progressBar.value) return;
  if (!player.value) return;
  console.log('mouse enter', event.offsetX);
  if (event.offsetX < 3) return;
  console.log('offset', event.offsetX);
  seekingHoverPosition.value = event.offsetX;
}

function handleProgressBarMouseMove(event: MouseEvent) {
  if (!progressBar.value) return;
  if (!player.value) return;
  // TODO: for some reason event.offsetX in the handleProgressBarClick
  // handler reports incorrect values (close to 0) when the
  // mouse move event handler is active. So I'm disabling it temporarily
  // until I figure out the problem
  return;
  // TODO: sometimes the offsetX jumps to 0-2 even when the mouse is
  // in the middle of the progress bar, this causes
  // flickering of the seek indicator. So for now
  // we ignore offsetX 0-2.
  if (event.offsetX < 3) return;
  seekingHoverPosition.value = event.offsetX;
}

function handleProgressBarMouseLeave() {
  seekingHoverPosition.value = undefined;
}

function handleCanPlay() {
  if (!player.value) return;
  duration.value = player.value.duration || 0;
  volume.value = player.value.volume;
}

function getTimeFromPosition(seekPosition: number): number {
  if (!progressBar.value) return 0;
  if (!player.value) return 0;
  const width = progressBar.value.offsetWidth;
  const time = (seekPosition / width) * player.value.duration;
  console.log('pos to time', seekPosition, width, time);
  return time;
}

</script>