<template>
  <div class="w-full h-full max-h-full">
    <div v-if="mediaType === 'video'"
      class="bg-black max-h-full"
    >
    <media-player
      ref="player"
      view-type="video"
      stream-type="on-demand"
      playsinline
      @can-play="handleCanPlay()"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @timeupdate="handleTimeUpdate()"
      @time-update="handleTimeUpdate()"
      @progress="handleProgress($event)"
      @seeked="$emit('seeked')"
    >
      <media-provider>
        <source v-for="src in sources"
          :key="src.url"
          :src="src.url"
          :type="src.mimeType"
        />
      </media-provider>
      <media-video-layout>
      </media-video-layout>
    </media-player>
    </div>
    <div v-else class="bg-black p-10 flex flex-col items-center justify-center">
      <MusicalNoteIcon class="h-24 w-24 text-white" />
      <media-player
        ref="player"
        view-type="audio"
        stream-type="on-demand"
        playsinline
        @can-play="handleCanPlay()"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @timeupdate="handleTimeUpdate()"
        @time-update="handleTimeUpdate()"
        @progress="handleProgress($event)"
        @seeked="$emit('seeked')"
      >
        <media-provider>
          <source v-for="src in sources"
            :key="src.url"
            :src="src.url"
            :type="src.mimeType"
          />
        </media-provider>
        <media-audio-layout>
        </media-audio-layout>
      </media-player>
    </div>
    <div
      ref="progressBar"
      data-progress-bar="true"
      class="relative h-2 border-x-[0.5px] border-x-black cursor-pointer w-full"
      
      @mouseenter="handleProgressBarMouseEnter($event)"
      @mousemove="handleProgressBarMouseMove($event)"
      @mouseleave="handleProgressBarMouseLeave()"
      @click="handleProgressBarClick($event)"
    >
      <div class="absolute h-2 w-full bg-[#24141f]"></div>
      <div
        v-for="segment in bufferedSegments"
        :key="segment.key"
        class="absolute h-2 bg-slate-500"
        :style="{ left: `${segment.startPct}%`, width: `${segment.lengthPct}%`}"
      ></div>
      <div class="absolute h-2 bg-blue-400" :style="{ width: `${playPercentage}%`}"></div>
      
      <div v-if="seekingHoverPosition !== undefined" class="absolute h-2 w-[2px] bg-white" :style="{ left: `${seekingHoverPosition}px`}"></div>
      <div
        v-if="seekingHoverTime !== undefined"
        class="absolute top-[-40px] text-white px-10 py-1 bg-gray-700 opacity-70 rounded-md translate-x-[-50%] z-10"
        :style="{ left: `${seekingHoverPosition}px`}"
      >
        {{ formatTimestampDuration(seekingHoverTime) }}
      </div>
      <div @click.stop
        v-if="hoveredComment"
        class="absolute bottom-[20px] bg-gray-800 rounded-md px-5 py-2 text-ellipsis text-xs max-w-[200px] h-12 overflow-hidden translate-x-[-50%]"
        :style="{ left: `${getPositionFromTime(hoveredComment.timestamp)}px`}"
      >
        <div class="font-semibold text-gray-300">{{ hoveredComment.author.name }}</div>
        <div class="truncate">{{ hoveredComment.text }}</div>
      </div>
    </div>
    <div class="bg-black border-t border-t-[#24141f] h-7 flex flex-row items-center relative">
      <div
        v-for="comment in comments"
        :key="comment._id"
        @click="handleCommentClick(comment)"
        @mouseenter="handleCommentMouseEnter(comment)"
        @mouseleave="handleCommentMouseLeave()"
        class="h-3 w-3 rounded-full  absolute cursor-pointer translate-x-[-50%]"
        :class="{
          'ring-offset-1 ring-offset-white ring-1': comment._id === selectedCommentId,
          'bg-blue-400 border-b border-blue-800': !versionId || (comment.mediaVersionId === versionId),
          'bg-gray-400 border-b border-gray-800': versionId && (comment.mediaVersionId !== versionId)
          }"
        :style="{ left: `${getPositionFromTime(comment.timestamp)}px`}"
      ></div>
    </div>
    <div class="bg-black border-t border-t-[#24141f] p-2 flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-2">
        <div>
          <PlayIcon v-if="!isPlaying" class="h-5 w-5 cursor-pointer" @click="play()"/>
          <PauseIcon v-else class="h-5 w-5 cursor-pointer" @click="pause()"/>
        </div>
        <div>
          <SpeakerWaveIcon v-if="!isMuted" class="h-5 w-5 cursor-pointer" @click="mute()"/>
          <SpeakerXMarkIcon v-if="isMuted" class="h-5 w-5 cursor-pointer" @click="unmute()"/>
        </div>
        <div>
          <Slider :model-value="[volume]" @update:model-value="handleSliderUpdate($event)" :min="0" :max="1" :step="0.01" class="w-[80px]" />
        </div>
      </div>
      <div>
        <span class="text-gray-300">{{ formatTimestampDuration(playTime) }}</span> / {{ formatTimestampDuration(duration) }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import 'vidstack/bundle';
import { type MediaPlayer } from 'vidstack';
import { formatTimestampDuration, type TimedComment } from '@/core';
import { ref, computed, watch } from 'vue';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon , MusicalNoteIcon} from '@heroicons/vue/24/solid';
import Slider from '@/components/ui/Slider.vue';
import { logger } from '@/app-utils';
import { nextTick } from 'process';

type MediaSource = {
  url: string;
  type: 'hls'|'dash'|'raw';
  mimeType?: string;
};

const props = defineProps<{
  sources: MediaSource[];
  comments?: TimedComment[];
  selectedCommentId?: string;
  mediaType: 'video'|'audio';
  versionId?: string;
}>();

const emit = defineEmits<{
  (e: 'seeked'): void;
  (e: 'clickComment', comment: TimedComment): void;
  (e: 'playBackError', error: Error): void;
}>();

defineExpose({
  seek,
  pause,
  play,
  getCurrentTime
});

const player = ref<MediaPlayer>();
const progressBar = ref<HTMLDivElement>();

const isPlaying = ref(false);
const playTime = ref(0);
const playPercentage = computed(() => {
  if (!player.value) return 0;
  const current = playTime.value;
  const total = player.value.duration;
  return 100 * current/total;
});

const buffered = ref<TimeRanges>();
const bufferedSegments = computed(() => {
  if (!buffered.value || !player.value) return [];
  const segments = [];
  for (let i = 0; i < buffered.value.length; i++) {
    const start = buffered.value.start(i);
    const end = buffered.value.end(i);
    const length = end - start;
    const segment = {
      key: `${start}-${end}`,
      start,
      startPct: 100 * start / player.value.duration,
      end,
      endPct: 100 * end /player.value.duration,
      length,
      lengthPct: 100 * length / player.value.duration
    };
    segments.push(segment);
  }

  return segments;
});

const hoveredCommentId = ref<string>();
const hoveredComment = computed(() => props.comments?.find(c => c._id === hoveredCommentId.value));
// When the video player is mounted,
// the duration is NaN
// So we update the duration manually
// when canplay event has been triggered.
const duration = ref(0);
const isMuted = ref(false);
const volume = ref(0);
const prevVolume = ref(0);

watch(props, (curr, prev) => {
  // change in props.src does not to automatically
  // change the src of the video because we're using the
  // <source> element to set the source. So we do it
  // manually here instead.
  // TODO: how to update the mime type to match the new source?
  if (!player.value) return;
  // just in case the video is currently playing, let's
  // reset it first before we change the source
  // otherwise the user might get issues trying to play
  // the new source
  const currentTime = player.value.currentTime;
  pause();
  seek(0);
  // change the source in the next tick to ensure
  // the reset has happened
  
  nextTick(() => {
    if (!player.value) return;
    // player.value.src = curr.src;
    // seek to the same time where the previous version was playing
    // at.
    // TODO: this updates the timestamp but does not update the 
    // play progress bar until the user clicks the play
    // button again. Please investigate
    seek(currentTime);
  });
});

watch([volume], (curr, prev) => {
  if (!player.value) return;
  player.value.volume = volume.value;
  prevVolume.value = prev[0];
  if (volume.value == 0.0) {
    isMuted.value = true;
  }
  else if (isMuted.value) {
    isMuted.value = false;
  }
});

const seekingHoverPosition = ref<number|undefined>(undefined);
const seekingHoverTime = computed<number|undefined>(() => {
  if (seekingHoverPosition.value === undefined) return;
  return getTimeFromPosition(seekingHoverPosition.value);
});


function seek(to: number) {
  if (!player.value) return;
  player.value.currentTime = to;
}

function pause() {
  player.value?.pause();
}

async function play() {
  try {
    await player.value?.play();
  }
  catch (e: any) {
    emit('playBackError', e);
  }
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
  if (!progressBar.value) return;
  // this event may have been triggered by one of the
  // progress bar's children. So we use the
  // progress bar's position as a reference instead of relying on event.offsetX
  
  const offsetX = progressBar.value?.getBoundingClientRect().x;
  const relativeMouseX = Math.max(event.clientX - offsetX, 0);
  const newTime = getTimeFromPosition(relativeMouseX);
  return seek(newTime);
}

function handleProgressBarMouseEnter(event: MouseEvent) {
  if (!progressBar.value) return;
  if (!player.value) return;
  const offsetX = progressBar.value?.getBoundingClientRect().x;
  const relativeMouseX = Math.max(event.clientX - offsetX, 0);
  seekingHoverPosition.value = relativeMouseX;
}

function handleProgressBarMouseMove(event: MouseEvent) {
  if (!progressBar.value) return;
  if (!player.value) return;
  const offsetX = progressBar.value?.getBoundingClientRect().x;
  const relativeMouseX = Math.max(event.clientX - offsetX, 0);
  seekingHoverPosition.value = relativeMouseX;
}

function handleProgressBarMouseLeave() {
  seekingHoverPosition.value = undefined;
}

function handleCanPlay() {
  if (!player.value) return;
  duration.value = player.value.duration || 0;
  volume.value = player.value.volume;
}

function handleProgress(event: any) {
  if (event.detail?.buffered) {
    buffered.value = event.detail.buffered;
    // @ts-ignore
  } else if (player.value?.buffered) {
    // @ts-ignore
    buffered.value = player.value?.buffered;
  }
}

function getTimeFromPosition(seekPosition: number): number {
  if (!progressBar.value) return 0;
  if (!player.value) return 0;
  const width = progressBar.value.offsetWidth;
  const time = (seekPosition / width) * player.value.duration;
  return time;
}

function getPositionFromTime(timestamp: number): number {
  if (!progressBar.value) return 0;
  if (!player.value) return 0;
  const duration = player.value.duration;
  const width = progressBar.value.offsetWidth;
  const x = (timestamp / duration) * width;
  return x;
}

function handleSliderUpdate(value: number[]|undefined) {
  if (value === undefined) return;
  volume.value = value[0];
}

function handleCommentClick(comment: TimedComment) {
  emit('clickComment', comment);
}

function handleCommentMouseEnter(comment: TimedComment) {
  hoveredCommentId.value = comment._id;
}

function handleCommentMouseLeave() {
  hoveredCommentId.value = undefined;
}
</script>
<style scoped>
/* Hide Vidstack's playback controls because we use custom ones */
.vds-time-slider {
  display: none;
}
.vds-video-layout {
  display: none;
}

.vds-audio-layout {
  display: none;
}
</style>