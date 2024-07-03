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
      <KonvaCircle :config="configCircle"></KonvaCircle>
    </KonvaLayer>
  </KonvaStage>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue';
import konva from 'konva';

const stage = ref<{ getStage: () => konva.Stage }>();
const layerWrapper = ref<{ getNode: () => konva.Layer }>();

const props = defineProps<{
  height: number;
  width: number;
}>()
const configKonva = computed(() => ({
  width: props.width,
  height: props.height
}));

const configCircle = {
  x: 100,
  y: 100,
  radius: 70,
  fill: "red",
  stroke: "black",
  strokeWidth: 4
}

let lastLine: konva.Line;
let isPaint = false;

function handleStageMouseDown(e: konva.KonvaPointerEvent) {
  if (!layerWrapper.value) {
    return;
  }

  isPaint = true;
  const s = e.target.getStage()!;
  const pos = s.getPointerPosition()!;
  
  const layer = layerWrapper.value.getNode();

  lastLine = new konva.Line({
    stroke: '#df4b26',
    strokeWidth: 5,
    globalCompositeOperation: 'source-over',
    // round cap for smoother lines
    lineCap: 'round',
    lineJoin: 'round',
    // add point twice, so we have some drawings even on a simple click
    points: [pos.x, pos.y, pos.x, pos.y],
  });

  layer.add(lastLine)
  
}

function handleStageMouseMove(e: konva.KonvaPointerEvent) {
  if (!isPaint) {
    return;
  }

  // prevent scrolling on touch devices
  e.evt.preventDefault();

  const pos = e.target.getStage()!.getPointerPosition()!;
  var newPoints = lastLine.points().concat([pos.x, pos.y]);
  lastLine.points(newPoints);
}

function handleStageMouseUp(e: konva.KonvaPointerEvent) {
  isPaint = false;
}
</script>