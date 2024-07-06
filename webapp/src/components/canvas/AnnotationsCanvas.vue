<template>
  <KonvaStage
    ref="stage"
    :config="configKonva"
    @mousedown="handleStageMouseDown($event)"
    @touchstart="handleStageMouseDown($event)"
    @mousemove="handleStageMouseMove($event)"
    @touchmove="handleStageMouseMove($event)"
    @mouseup="handleStageMouseUp($event)"
    @touchend="handleStageMouseUp($event)"
  >
    <KonvaLayer ref="layerWrapper">
      <KonvaLine v-for="line in konvaShapes" :config="line"></KonvaLine>
    </KonvaLayer>
  </KonvaStage>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue';
import konva from 'konva';
import type { CanvasDrawingTool } from './types';
import type { FrameAnnotationShape } from "@quickbyte/common";
import { createDrawingTool, scalePosition, scaleShape, shapeToKonva } from './canvas-helpers';

const props = defineProps<{
  height: number;
  width: number;
}>()

const stage = ref<{ getStage: () => konva.Stage }>();
const layerWrapper = ref<{ getNode: () => konva.Layer }>();

const baseWidth = 1980;
const currentTool = ref<CanvasDrawingTool>();

const configKonva = computed(() => ({
  width: props.width,
  height: props.height
}));

const scaleFactor = computed(() => configKonva.value.width / baseWidth);

const shapes = ref<FrameAnnotationShape[]>([]);

const konvaShapes = computed(() =>
  shapes.value.map(s => shapeToKonva(scaleShape(s, scaleFactor.value))
));

let nextShapeId = 1;

function handleStageMouseDown(e: konva.KonvaPointerEvent) {
  if (!layerWrapper.value) {
    return;
  }

  const s = e.target.getStage();
  if (!s) {
    return;
  }

  const pos = s.getPointerPosition();
  if (!pos) {
    return;
  }

  currentTool.value = createDrawingTool({
    type: 'pencil',
    config: {
      strokeColor: '#df4b26',
      strokeWidth: 5,
      shapeId: `${nextShapeId++}`
    }
  }, (shape) => {
    const currentIndex = shapes.value.findIndex(s => s.id === shape.id);
    if (currentIndex === -1) {
      shapes.value.push(shape);
    }
    else {
      shapes.value[currentIndex] = shape;
    }
  });

  // the drawing tool assumes the virtual canvas,
  // it is not aware of the actual canvas size
  currentTool.value.handlePointerStart({
    stage: s,
    pos: scalePosition(pos, 1 / scaleFactor.value)
  });
}

function handleStageMouseMove(e: konva.KonvaPointerEvent) {
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
</script>