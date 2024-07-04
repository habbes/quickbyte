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
      <KonvaLine v-for="line in lines" :config="line"></KonvaLine>
    </KonvaLayer>
  </KonvaStage>
</template>
<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import konva from 'konva';

const stage = ref<{ getStage: () => konva.Stage }>();
const layerWrapper = ref<{ getNode: () => konva.Layer }>();

const baseWidth = 1980;

const props = defineProps<{
  height: number;
  width: number;
}>()

const configKonva = computed(() => ({
  width: props.width,
  height: props.height
}));

const scaleFactor = computed(() => configKonva.value.width / baseWidth);

watch(configKonva, () => {
  console.log('config', configKonva.value);
});

const configCircle = computed(() => ({
  x: 100 * scaleFactor.value,
  y: 100 * scaleFactor.value,
  radius: 70 * scaleFactor.value,
  fill: "red",
  stroke: "black",
  strokeWidth: 4 * scaleFactor.value
}));

const lineSources = ref<konva.LineConfig[]>([]);

const lines = computed(() => lineSources.value.map(l => ({
  ...l,
  strokeWidth: l.strokeWidth! * scaleFactor.value,
  points: (l.points || []).map(p => p * scaleFactor.value)
})));


let isPaint = false;

function handleStageMouseDown(e: konva.KonvaPointerEvent) {
  if (!layerWrapper.value) {
    return;
  }

  isPaint = true;
  const s = e.target.getStage()!;
  const pos = s.getPointerPosition()!;
  
  const layer = layerWrapper.value.getNode();

  const newLine: konva.LineConfig = {
    stroke: '#df4b26',
    strokeWidth: 5 / scaleFactor.value,
    globalCompositeOperation: 'source-over',
    // round cap for smoother lines
    lineCap: 'round',
    lineJoin: 'round',
    // add point twice, so we have some drawings even on a simple click
    points: [pos.x / scaleFactor.value, pos.y / scaleFactor.value, pos.x / scaleFactor.value, pos.y / scaleFactor.value],
  };

  lineSources.value.push(newLine)
  
}

function handleStageMouseMove(e: konva.KonvaPointerEvent) {
  if (!isPaint) {
    return;
  }

  // prevent scrolling on touch devices
  e.evt.preventDefault();

  const pos = e.target.getStage()!.getPointerPosition()!;
  const lastLine = lineSources.value.at(-1);
  var newPoints = [...lastLine!.points!, pos.x / scaleFactor.value, pos.y / scaleFactor.value];
  lastLine!.points = newPoints;
}

function handleStageMouseUp(e: konva.KonvaPointerEvent) {
  isPaint = false;
}
</script>