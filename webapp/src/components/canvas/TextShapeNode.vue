<template>
  <div
    class="absolute text-wrap overflow p-0"
    :style="{
      left: `${config.x}px`,
      top: `${config.y}px`,
      width: `${config.width + 2}px`,
      fontSize: `${config.fontSize}px`,
      fontFamily: config.fontFamily,
      fontWeight: config.fontStyle === 'bold' ? 'bold' : 'normal',
      color: isTransparent(config.backgroundColor) ? config.color : 'white',
      lineHeight: 1
    }"
  >
    <div
      class="absolute left-0 right-0 bottom-0 top-0 opacity-50 -z-10"
      :style="{ backgroundColor: config.backgroundColor }"
    ></div>
    <div>{{ config.text }}</div>
  </div>
</template>
<script lang="ts" setup>
import type { FrameAnnotationText } from "@quickbyte/common";

defineProps<{
  config: FrameAnnotationText
}>();


function isTransparent(color?: string) {
  return color === 'transparent' || !color;
}
</script>