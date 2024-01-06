<script setup lang="ts">
import type { SliderRootEmits, SliderRootProps } from 'radix-vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useEmitAsProps } from 'radix-vue'
// import { cn } from '@/lib/utils.js';

const props = defineProps<SliderRootProps>()
const emits = defineEmits<SliderRootEmits>()

const emitsAsProps = useEmitAsProps(emits)
</script>

<template>
  <SliderRoot
    class="relative flex w-full touch-none select-none items-center"
    v-bind="{ ...props, ...emitsAsProps }"
  >
    <SliderTrack class="relative h-1 w-full grow overflow-hidden rounded-full bg-[#333]">
      <SliderRange class="absolute h-full bg-[#c2c2c2]" />
    </SliderTrack>
    <SliderThumb class="block h-3 w-3 rounded-full border-2 border-white bg-white ring-offset-background transition-colors focus-visible:outline-none  disabled:pointer-events-none disabled:opacity-50 cursor-pointer" />
  </SliderRoot>
</template>