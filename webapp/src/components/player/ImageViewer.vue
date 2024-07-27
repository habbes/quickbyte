<template>
  <div class="w-full flex justify-center relative">
    <div class="absolute z-10">
      <AnnotationsCanvas
        v-if="annotationsDrawingTool && width && height"
        :width="width"
        :height="height"
        :drawingToolConfig="annotationsDrawingTool"
        @updateAnnotations="$emit('drawAnnotations', $event)"
      />
      <AnnotationsCanvas
        v-else-if="currentAnnotations && width && height"
        :width="width"
        :height="height"
        :annotations="currentAnnotations"
      />
    </div>
    <img
      ref="image"
      :src="src"
      :alt="alt"
      :class="{
        'h-full': fillDimension === 'height',
        'w-full': fillDimension === 'width'
      }"
    >
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import type { FrameAnnotationCollection, Comment } from "@quickbyte/common";
import { AnnotationsCanvas, type DrawingToolConfig } from "@/components/canvas";

type FillDimension = 'height'|'width';

const props = defineProps<{
  src: string;
  comments?: Comment[];
  selectedCommentId?: string;
  annotationsDrawingTool?: DrawingToolConfig
  /**
   * Alternative text in case the image can't be rendered.
   */
  alt?: string;
}>();

defineEmits<{
  (e: 'drawAnnotations', annotations: FrameAnnotationCollection): unknown;
}>();

const image = ref<HTMLImageElement>();
const width = ref<number>();
const height = ref<number>();
const fillDimension = ref<FillDimension>('height');

const sizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    
    if (entry.target === image.value) {
      width.value = entry.contentRect.width;
      height.value = entry.contentRect.height;
    }
  }
});

const selectedComment = computed(() => props.comments?.find(c => c._id === props.selectedCommentId));
const currentAnnotations = computed(() => selectedComment.value?.annotations);

onMounted(() => {
  if (!image.value) {
    return;
  }

  console.log('mounted img hhww', props.alt, image.value?.height, image.value?.clientHeight, image.value?.width, image.value?.clientWidth);
  sizeObserver.observe(image.value);
  updateFillDimension();
});

function updateFillDimension() {
  // if (!image.value) {
  //   return;
  // }

  // fillDimension.value = image.value.height > image.value.width ? 'height' : 'width';
  // console.log('update fill dim to', props.alt, fillDimension.value);
}

onUnmounted(() => {
  sizeObserver.disconnect();
});
</script>