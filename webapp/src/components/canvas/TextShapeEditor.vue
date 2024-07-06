<template>
  <div
    class="absolute text-wrap overflow bg-red text-white"
    :style="{
      left: `${config.x}px`,
      top: `${config.y}px`,
      width: `${config.width}px`
    }"
  >
    {{ config.text }}
  </div>
</template>
<script lang="ts" setup>
import type { FrameAnnotationText } from "@quickbyte/common";

const props = defineProps<{
  config: FrameAnnotationText
}>();
console.log('props', props);
</script>