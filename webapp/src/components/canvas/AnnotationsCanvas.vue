<template>
  <div class="relative p-0" :style="{ width, height }">
    <KonvaStage
      :config="konvaConfig"
      @mousedown="handleStageMouseDown($event)"
      @touchstart="handleStageMouseDown($event)"
      @mousemove="handleStageMouseMove($event)"
      @touchmove="handleStageMouseMove($event)"
      @mouseup="handleStageMouseUp($event)"
      @touchend="handleStageMouseUp($event)"
    >
      <KonvaLayer>
        <template
          v-for="shape in shapes"
          :key="shape.id"
        >
          <template v-if="shape.type === 'path'">
            <KonvaLine :config="shapeToKonva(shape, scaleFactor)"></KonvaLine>
          </template>
          <template v-else-if="shape.type === 'circle'">
            <KonvaCircle :config="shapeToKonva(shape, scaleFactor)"></KonvaCircle>
          </template>
          <template v-else-if="shape.type === 'rect'">
            <KonvaRect :config="shapeToKonva(shape, scaleFactor)"></KonvaRect>
          </template>
          <template v-else-if="shape.type === 'line'">
            <KonvaLine :config="shapeToKonva(shape, scaleFactor)"></KonvaLine>
          </template>
          <template v-else-if="shape.type === 'text'">
            <KonvaText :config="shapeToKonva(shape, scaleFactor)"></KonvaText>
          </template>
        </template>
      </KonvaLayer>
    </KonvaStage>
    <!-- <template v-for="shape in textShapes" :key="shape.id">
      <TextShapeEditor :config="scaleTextShape(shape, scaleFactor)" />
    </template> -->
  </div>
</template>
<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import konva from 'konva';
import type { CanvasDrawingTool, DrawingToolConfig } from './types';
import type { FrameAnnotationShape, FrameAnnotationCollection } from "@quickbyte/common";
import { createDrawingTool, scalePosition, shapeToKonva, scaleTextShape } from './canvas-helpers';
import { injectCanvasController } from './canvas-controller.js';
import TextShapeEditor from './TextShapeEditor.vue';

const props = defineProps<{
  height: number;
  width: number;
  drawingToolConfig?: DrawingToolConfig;
  annotations?: FrameAnnotationCollection;
}>();

const emit = defineEmits<{
  (e: 'updateAnnotations', annotations: FrameAnnotationCollection): void;
}>();

defineExpose({ undoShape, redoShape });

/**
 * This is used to manage scaling and to retain the relative
 * positions of all shapes on the canvas on different screen sizes.
 * To achieve this, a scale factor is computed as the ration between the
 * current canvas width and the reference width.
 * The drawing tools are not aware of the actual canvas, they create
 * shapes based on the reference width. When these shapes are passed
 * onto the actual canvas for rendering, they'll be scaled based on
 * the scaling factor to properly fit within the dimensions of the canvas.
 */
const REFERENCE_WIDTH = 1980;
const currentTool = ref<CanvasDrawingTool>();

const konvaConfig = computed(() => ({
  width: props.width,
  height: props.height
}));

const shapes = ref<FrameAnnotationShape[]>(props.annotations ? props.annotations.annotations : []);
const scaleFactor = computed(() => konvaConfig.value.width / (props.annotations? props.annotations.width : REFERENCE_WIDTH));

const textShapes = computed(() => shapes.value.filter(s => s.type === 'text'));
/**
 * Used to stash shapes that have been "undone" to facilitate a "redo"
 * operation.
 */
const stashedShapes = ref<FrameAnnotationShape[]>([]);
const controller = injectCanvasController();
const redoSignal = controller?.getRedoSignal() || ref();
const undoSignal = controller?.getUndoSignal() || ref();

watch(undoSignal, () => {
  undoShape();
});

watch(redoSignal, redoShape);

watch(() => props.annotations, () => {
  if (!props.annotations) {
    return;
  }

  shapes.value = props.annotations?.annotations;
  resetUndoStack();
});

let nextShapeId = 1;

function resetUndoStack() {
  stashedShapes.value = [];
}

function undoShape() {
  const shape = shapes.value.pop();
  if (!shape) {
    return;
  }

  stashedShapes.value.push(shape);
}

function redoShape() {
  const shape = stashedShapes.value.pop();
  if (shape) {
    shapes.value.push(shape);
  }
}

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
        // when we add a new shape, clear the undo stack
        resetUndoStack();
        shapes.value.push(shape);
      }
      else {
        shapes.value[currentIndex] = shape;
      }

      emitAnnotationsUpdateEvent();
    });

  // Since the positions are based on the actual canvas,
  // we have to scale them up to the reference canvas for
  // the drawing tools.
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
    width: REFERENCE_WIDTH,
    height: props.height / scaleFactor.value,
    annotations: shapes.value
  });
}
</script>