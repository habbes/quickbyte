<template>
  <KonvaStage
    :config="configKonva"
    @mousedown="handleStageMouseDown($event)"
    @touchstart="handleStageMouseDown($event)"
    @mousemove="handleStageMouseMove($event)"
    @touchmove="handleStageMouseMove($event)"
    @mouseup="handleStageMouseUp($event)"
    @touchend="handleStageMouseUp($event)"
  >
    <KonvaLayer>
      <KonvaLine v-for="line in konvaShapes" :config="line"></KonvaLine>
    </KonvaLayer>
  </KonvaStage>
</template>
<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import konva from 'konva';
import type { CanvasDrawingTool, DrawingToolConfig } from './types';
import type { FrameAnnotationShape, FrameAnnotationCollection } from "@quickbyte/common";
import { createDrawingTool, scalePosition, scaleShape, shapeToKonva } from './canvas-helpers';

const props = defineProps<{
  height: number;
  width: number;
  drawingToolConfig?: DrawingToolConfig;
  annotations?: FrameAnnotationCollection;
}>();

const emit = defineEmits<{
  (e: 'updateAnnotations', annotations: FrameAnnotationCollection): void;
}>();

const BASE_WIDTH = 1980;
const currentTool = ref<CanvasDrawingTool>();

const configKonva = computed(() => ({
  width: props.width,
  height: props.height
}));

const scaleFactor = computed(() => configKonva.value.width / BASE_WIDTH);

const shapes = ref<FrameAnnotationShape[]>(props.annotations ? props.annotations.annotations : []);

const konvaShapes = computed(() =>
  shapes.value.map(s => shapeToKonva(scaleShape(s, scaleFactor.value))
));

watch(() => props.annotations, () => {
  if (!props.annotations) {
    return;
  }

  shapes.value = props.annotations?.annotations;
});

let nextShapeId = 1;

function handleStageMouseDown(e: konva.KonvaPointerEvent) {
  if (!props.drawingToolConfig) {
    return;
  }

  const stage = e.target.getStage();
  if (!stage) {
    return;
  }

  const pos = stage.getPointerPosition();
  if (!pos) {
    return;
  }

  currentTool.value = createDrawingTool(`${nextShapeId++}`, 
    props.drawingToolConfig,
    (shape) => {
      const currentIndex = shapes.value.findIndex(s => s.id === shape.id);
      if (currentIndex === -1) {
        shapes.value.push(shape);
      }
      else {
        shapes.value[currentIndex] = shape;
      }

      emitAnnotationsUpdateEvent();
    });

  // the drawing tool assumes the virtual canvas,
  // it is not aware of the actual canvas size
  currentTool.value.handlePointerStart({
    stage,
    pos: scalePosition(pos, 1 / scaleFactor.value)
  });
}

function handleStageMouseMove(e: konva.KonvaPointerEvent) {
  if (!props.drawingToolConfig) {
    return;
  }

  if (!currentTool.value) {
    return;
  }

  // prevent scrolling on touch devices
  e.evt.preventDefault();

  const stage = e.target.getStage();
  if (!stage) {
    return;
  }

  const pos = stage.getPointerPosition();
  if (!pos) {
    return;
  }

  currentTool.value.handlePointerMove({
    stage,
    pos: scalePosition(pos, 1 / scaleFactor.value)
  });
}

function handleStageMouseUp(e: konva.KonvaPointerEvent) {
  currentTool.value = undefined;
}

function emitAnnotationsUpdateEvent() {
  emit('updateAnnotations', {
    width: BASE_WIDTH,
    height: props.height / scaleFactor.value,
    annotations: shapes.value
  });
}
</script>