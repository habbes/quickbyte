<template>
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
      v-if="$slots.extraHoverContent"
      class="absolute bottom-[20px] bg-gray-800 rounded-md px-5 py-2 text-ellipsis text-xs max-w-[200px] h-12 overflow-hidden translate-x-[-50%]"
    >
      <slot name="extraHoverContent" :parentWidth="progressBar?.offsetWidth" :totalTime="totalTime"></slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed } from "vue";
import { formatTimestampDuration } from "@/core";

const props = defineProps<{
  currentTime: number;
  totalTime: number;
  bufferedRanges?: TimeRanges;
}>();

const emit = defineEmits<{
  (e: 'seek', timestamp: number): unknown;
}>();

const progressBar = ref<HTMLDivElement>();
const seekingHoverPosition = ref<number|undefined>(undefined);
  const seekingHoverTime = computed<number|undefined>(() => {
  if (seekingHoverPosition.value === undefined) return;
  return getTimeFromPosition(seekingHoverPosition.value);
});

const playPercentage = computed(() => {
  const current = props.currentTime;
  const total = props.totalTime;
  return total == 0 ? 0 : 100 * current/total;
});

const bufferedSegments = computed(() => {
  if (!props.bufferedRanges) return [];

  const buffered = props.bufferedRanges;
  const segments = [];
  for (let i = 0; i < buffered.length; i++) {
    const start = buffered.start(i);
    const end = buffered.end(i);
    const length = end - start;
    const segment = {
      key: `${start}-${end}`,
      start,
      startPct: 100 * start / props.totalTime,
      end,
      endPct: 100 * end / props.totalTime,
      length,
      lengthPct: 100 * length / props.totalTime
    };
    segments.push(segment);
  }

  return segments;
  
});

function handleProgressBarClick(event: MouseEvent) {
  if (!progressBar.value) return;
  // this event may have been triggered by one of the
  // progress bar's children. So we use the
  // progress bar's position as a reference instead of relying on event.offsetX
  
  const offsetX = progressBar.value?.getBoundingClientRect().x;
  const relativeMouseX = Math.max(event.clientX - offsetX, 0);
  const newTime = getTimeFromPosition(relativeMouseX);
  return emit('seek', newTime);
}

function handleProgressBarMouseEnter(event: MouseEvent) {
  if (!progressBar.value) return;
  const offsetX = progressBar.value?.getBoundingClientRect().x;
  const relativeMouseX = Math.max(event.clientX - offsetX, 0);
  seekingHoverPosition.value = relativeMouseX;
}

function handleProgressBarMouseMove(event: MouseEvent) {
  if (!progressBar.value) return;
  const offsetX = progressBar.value?.getBoundingClientRect().x;
  const relativeMouseX = Math.max(event.clientX - offsetX, 0);
  seekingHoverPosition.value = relativeMouseX;
}

function handleProgressBarMouseLeave() {
  seekingHoverPosition.value = undefined;
}

function getTimeFromPosition(seekPosition: number): number {
  if (!progressBar.value) return 0;
  if (!props.totalTime) return 0;
  const width = progressBar.value.offsetWidth;
  const time = (seekPosition / width) * props.totalTime;
  return time;
}

function getPositionFromTime(timestamp: number): number {
  if (!progressBar.value) return 0;
  if (!props.totalTime) return 0;
  const duration = props.totalTime;
  const width = progressBar.value.offsetWidth;
  const x = (timestamp / duration) * width;
  return x;
}

</script>