<template>
  <div class="w-full h-full max-h-full">
    <div v-if="mediaType === 'video'"
      class="bg-black max-h-full relative"
      :style="`height: ${videoHeight}px`"
    >
      <div class="absolute z-10">
        <AnnotationsCanvas
          v-if="annotationsDrawingTool && videoWidth && videoHeight"
          :height="videoHeight"
          :width="videoWidth"
          :drawingToolConfig="annotationsDrawingTool"
          @updateAnnotations="handleUpdateAnnotations($event)"
        />
        <AnnotationsCanvas
          v-else-if="currentFrameAnnotations && videoWidth && videoHeight"
          :height="videoHeight"
          :width="videoWidth"
          :annotations="currentFrameAnnotations"
        />
      </div>

      <!-- Getting type errors due to the props passed to the media-player.
        Ignoring the errors until I figure out what the causes them.
      -->
      <!-- @vue-ignore -->
      <media-player
        ref="player"
        view-type="video"
        stream-type="on-demand"
        playsInline
        @can-play="handleCanPlay()"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @timeupdate="handleTimeUpdate()"
        @time-update="handleTimeUpdate()"
        @progress="handleProgress($event)"
        @seeked="$emit('seeked')"
        fullscreen-orientation="none"
        @click.stop="togglePlay()"
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
    <div v-else
      class="bg-black p-10 flex flex-col items-center justify-center"
      :style="`height: ${audioHeight}px`"
      @click="togglePlay()"
    >
      <MusicalNoteIcon class="h-24 w-24 text-white" />
      <!-- Getting type errors due to the props passed to the media-player.
        Ignoring the errors until I figure out what the causes them.
      -->
      <!-- @vue-ignore -->
      <media-player
        ref="player"
        view-type="audio"
        stream-type="on-demand"
        playsInline
        @can-play="handleCanPlay()"
        @play="isPlaying = true"
        @pause="isPlaying = false"
        @error="$emit('playBackError', $event)"
        @timeupdate="handleTimeUpdate()"
        @time-update="handleTimeUpdate()"
        @progress="handleProgress($event)"
        @seeked="$emit('seeked')"
        @click.stop="togglePlay()"
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
        v-if="bufferedSegments"
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
        @click.stop="handleCommentClick(comment)"
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
    <!-- <div v-if="!hideControls" class="bg-black border-t border-t-[#24141f] p-2 flex flex-row items-center justify-between">
      <div class="flex flex-row items-center gap-2">
        <div>
          <PlayIcon v-if="!isPlaying" class="h-5 w-5 cursor-pointer" @click="play()"/>
          <PauseIcon v-else class="h-5 w-5 cursor-pointer" @click="pause()"/>
        </div>
        <div>
          <SpeakerWaveIcon v-if="!isMuted" class="h-5 w-5 cursor-pointer" @click="mute()"/>
          <SpeakerXMarkIcon v-if="isMuted" class="h-5 w-5 cursor-pointer" @click="unmute()"/>
        </div>
        <div class="hidden sm:block">
          <Slider :model-value="[volume]" @update:model-value="handleSliderUpdate($event)" :min="0" :max="1" :step="0.01" class="w-[80px]" />
        </div>
      </div>
      <div class="flex items-center gap-2 ">
        <span v-if="mediaType === 'video'">
          <ArrowsPointingOutIcon
            @click="enterFullScreen()"
            class="h-4 w-4 cursor-pointer hover:text-white"
            title="Full screen" 
          />
        </span>
        <span class="text-gray-300">{{ formatTimestampDuration(playTime) }}</span> / {{ formatTimestampDuration(duration) }}
      </div>
    </div> -->
  </div>
</template>
<script lang="ts" setup>
import 'vidstack/bundle';
import { type MediaPlayer } from 'vidstack';
import { formatTimestampDuration } from '@/core';
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon , MusicalNoteIcon, ArrowsPointingOutIcon} from '@heroicons/vue/24/solid';
import Slider from '@/components/ui/Slider.vue';
import { AnnotationsCanvas, type DrawingToolConfig } from '@/components/canvas';
import { logger, isSpaceBarPressed } from '@/app-utils';
import type { FrameAnnotationCollection, WithChildren, TimedCommentWithAuthor } from '@quickbyte/common';
import type { AVPlayerState } from './types'
import { findTopLevelOrChildCommentById } from "./comment-helpers.js";
import { haveMediaSourcesChanged, type MediaSource } from './media-helpers.js';

const props = defineProps<{
  sources: MediaSource[];
  comments?: WithChildren<TimedCommentWithAuthor>[];
  selectedCommentId?: string;
  mediaType: 'video'|'audio';
  versionId?: string;
  annotationsDrawingTool?: DrawingToolConfig;
  hideControls?: boolean;
  volume: number;
}>();

const emit = defineEmits<{
  (e: 'seeked'): void;
  (e: 'clickComment', comment: TimedCommentWithAuthor): void;
  (e: 'playBackError', error: Error): void;
  (e: 'fullscreenChange', fullscreen: boolean): void;
  (e: 'widthChange', width: number): void;
  (e: 'heightChange', height: number): void;
  (e: 'drawAnnotations', annotations: FrameAnnotationCollection): void;
  (e: 'stateChange', state: AVPlayerState): unknown;
}>();

defineExpose({
  seek,
  pause,
  play,
  getCurrentTime
});

const player = ref<MediaPlayer>();
let unsubscribePlayerEvents: ReturnType<MediaPlayer['subscribe']>|undefined;
const progressBar = ref<HTMLDivElement>();

const isPlaying = ref(false);
const canPlay = ref(false);
console.log('canPlay init to false');
const scheduledStartPlayWhenMediaReady = ref(false);
const playTime = ref(0);
const playPercentage = computed(() => {
  if (!player.value) return 0;
  const current = playTime.value;
  const total = player.value.duration;
  return 100 * current/total;
});

watch(isSpaceBarPressed, (newVal, oldVal) => {
  // detect when space bar goes from pressed to release
  if (oldVal && !newVal) {
    togglePlay();
  }
});

/**
 * Used to control whether or not Vidstack's built-in video controls are displayed
 */
const vidstackControlsDisplay = ref<'block'|'none'>('none');
const progressBarHeight = 8;
const commentsBarHeight = 28;
const controlsBarHeight = 37;
const videoWidth = ref<number>();
const videoHeight = ref<number>();
const audioHeight = 176;
const playerWithControllerHeight = computed(() => {
  if (props.mediaType === 'video') {
    if (isFullScreen.value) {
      return videoHeight.value;
    }

    if (!videoHeight.value) {
      return;
    }

    return videoHeight.value
      + progressBarHeight
      + commentsBarHeight
      + controlsBarHeight;
  }
  
  return audioHeight + progressBarHeight + commentsBarHeight + controlsBarHeight;
});

const isFullScreen = ref(false);

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

const selectedComment = computed(() => findTopLevelOrChildCommentById(props.comments || [], props.selectedCommentId || ''));
const hoveredCommentId = ref<string>();
const hoveredComment = computed(() => findTopLevelOrChildCommentById(props.comments || [], hoveredCommentId.value || ''));
const currentFrameAnnotations = computed(() => {
  if (isPlaying.value) {
    return undefined;
  }

  if (selectedComment.value) {
    // if it's a child comment, show the parent comment's annotations
    return selectedComment.value.annotations || selectedComment.value.parent?.annotations;
  }

  if (hoveredComment.value) {
    return hoveredComment.value.annotations || hoveredComment.value.parent?.annotations;
  }
});
// When the video player is mounted,
// the duration is NaN
// So we update the duration manually
// when canplay event has been triggered.
const duration = ref(0);
const isMuted = ref(false);
// const volume = ref(0);
const prevVolume = ref(0);

watch(isFullScreen, () => {
  if (!player.value) return;
  // currently, we don't show our custom controls in full screen mode. We
  // show the player's built-in controls instead.
  // Ideally, we should show our custom controls even in full-screen mode
  // for better consistency and feature parity. That's something
  // to look into for the future.
  if (isFullScreen.value) {
    // Initially I was using player.value.controls to toggle
    // control visibility. But for some reason,
    // after setting player.value.controls to true, the Vidstack's
    // exit full screen button stopped working
    // So now I switched to toggling the built-in controls visibility
    // using css.
    // player.value.controls = true;
    vidstackControlsDisplay.value = 'block';
  } else {
    player.value.controls = false;
    vidstackControlsDisplay.value = 'none';
  }
});

watch([duration, isPlaying, playTime], () => {
  emit('stateChange', {
    duration: duration.value,
    isPlaying: isPlaying.value,
    currentTime: playTime.value
  });
});

watch([videoWidth], () => {
  if (!videoWidth.value) return;
  emit('widthChange', videoWidth.value)
});

watch(playerWithControllerHeight, () => {
  if (!playerWithControllerHeight.value) return;
  emit('heightChange', playerWithControllerHeight.value);
}, { immediate: true });

// This helps keeps track of when the media
// source changes.
watch(() => props.sources, (curr, prev) => {
  if (!haveMediaSourcesChanged(curr, prev)) {
    // when the media sources change
    // the video stops playing and we don't get "pause" event
    // so we need to manually sync the play time and trigger
    // the playing if the media was already playing
    // we make sure not compare the actual urls such that if the
    // media is refetched with the same url, we don't mark canPlay as false
    // since the player has already loaded the urls.
    // TODO: I think a more robust solution would be to get an event from the player
    // when a video is loading or unplayable and use that to update canPlay.
    // I don't know if that event exists, should investigate soon.
    canPlay.value = false;
  }
  
  if (!player.value) return;

  const wasPlaying = isPlaying.value;
  isPlaying.value = false; // sync with the fact that the player has stopped
  const currentTime = player.value.currentTime;
  
  nextTick(() => {
    if (!player.value) return;

    seek(currentTime);
    // try to play if the media was playing before sources changed
    if (wasPlaying) {
      play();
    }
  });
});

watch(() => props.volume, (curr, prev) => {
  if (!player.value) return;
  player.value.volume = props.volume;
  prevVolume.value = prev;
  if (props.volume == 0.0) {
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

function togglePlay() {
  if (isPlaying.value) {
    pause();
  } else {
    play();
  }
}

function pause() {
  player.value?.pause();
}

async function play() {
  try {
    if (!canPlay.value) {
      logger.info(`Tried to play media version ${props.versionId} but player is not ready.`)
      scheduledStartPlayWhenMediaReady.value = true;
      return;
    }

    await player.value?.play();
  }
  catch (e: any) {
    emit('playBackError', e);
  }
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
  console.log('canPlay set to true');
  canPlay.value = true;
  if (scheduledStartPlayWhenMediaReady.value) {
    // Play was earlier requested but media was not ready.
    // So now we can fulfull the play request
    scheduledStartPlayWhenMediaReady.value = false;
    play();
  }

  duration.value = player.value.duration || 0;
  player.value.volume = props.volume;
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

async function enterFullScreen() {
  if (!player.value) return;
  try {
    await player.value.enterFullscreen();
  } catch {}
}

watch(player, () => {
  unsubscribePlayerEvents = player.value?.subscribe(({ fullscreen, width, height }) => {
    isFullScreen.value = fullscreen;
    videoWidth.value = width;
    videoHeight.value = height;
  });
}, { immediate: true });

onUnmounted(() => {
  unsubscribePlayerEvents && unsubscribePlayerEvents();
});

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

function handleCommentClick(comment: TimedCommentWithAuthor) {
  emit('clickComment', comment);
}

function handleCommentMouseEnter(comment: TimedCommentWithAuthor) {
  hoveredCommentId.value = comment._id;
}

function handleCommentMouseLeave() {
  hoveredCommentId.value = undefined;
}

function handleUpdateAnnotations(annotations: FrameAnnotationCollection) {
  emit('drawAnnotations', annotations);
}

</script>
<style scoped>
/* Vidstack video controls are shown or hidden depending on fullscreen state */
.vds-video-layout {
  display: v-bind('vidstackControlsDisplay');
}

/* Hide audio controls */

.vds-audio-layout {
  display: none;
}

[data-media-provider] {
  border-radius: 0px;
}
</style>