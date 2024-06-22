<template>
  <KonvaStage :config="configKonva">
    <KonvaLayer>
      <KonvaCircle :config="configCircle"></KonvaCircle>
    </KonvaLayer>
  </KonvaStage>
</template>
<script lang="ts" setup>
import { computed } from 'vue';



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
</script>