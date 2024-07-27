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
    >
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import type { FrameAnnotationCollection, Comment } from "@quickbyte/common";
import { AnnotationsCanvas, type DrawingToolConfig } from "@/components/canvas";

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

  sizeObserver.observe(image.value);
});


onUnmounted(() => {
  sizeObserver.disconnect();
});
</script>