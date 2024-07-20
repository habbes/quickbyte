<template>
  <div class="flex flex-col bg-black border-t border-t-[#24141f]">
    <UiPlaybackProgressBar
      :currentTime="playTime"
      :totalTime="duration"
    />
    <div class="bg-black border-t border-t-[#24141f] flex-1 p-2 flex flex-row items-center justify-between">
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
          <Slider :modelValue="[volume]" @update:modelValue="handleVolumeSliderUpdate($event)" :min="0" :max="1" :step="0.01" class="w-[80px]" />
        </div>
      </div>
      <div class="flex items-center gap-2 ">
        <span v-if="allowFullScreen">
          <ArrowsPointingOutIcon
            @click="enterFullScreen()"
            class="h-4 w-4 cursor-pointer hover:text-white"
            title="Full screen" 
          />
        </span>
        <span class="text-gray-300">{{ formatTimestampDuration(playTime) }}</span> / {{ formatTimestampDuration(duration) }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, watch, computed } from "vue";
import Slider from '@/components/ui/Slider.vue';
import { formatTimestampDuration, unwrapSingleton } from "@/core";
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon , ArrowsPointingOutIcon} from '@heroicons/vue/24/solid';
import { UiPlaybackProgressBar } from "@/components/ui";

defineProps<{
  isPlaying: boolean;
  playTime: number;
  duration: number;
  allowFullScreen?: boolean;
}>();

const emit = defineEmits<{
  (e: 'mute'): void;
  (e: 'unmute'): void;
  (e: 'pause'): void;
  (e: 'play'): void;
  (e: 'fullScreen'): void;
  (e: 'changeVolume', value: number): void;
}>();

const volume = defineModel<number>('volume', { required: true });
/**
 * Previous volume value. Used to restore volume after mute/unmute operation
 */
const prevVolume = ref<number>(volume.value);
const isMuted = computed(() => volume.value === 0);

watch(volume, (curr, prev) => {
  if (curr === 0) {
    prevVolume.value = prev;
  }
});

function enterFullScreen() {
  emit('fullScreen');
}

function handleVolumeSliderUpdate(rawValue: number[]|undefined) {
  const value = unwrapSingleton(rawValue);
  if (value === undefined) {
    return;
  }

  volume.value = value;
}

function mute() {
  volume.value = 0;
}

function unmute() {
  volume.value = prevVolume.value;
}

function play() {
  emit('play')
}

function pause() {
  emit('pause');
}
</script>