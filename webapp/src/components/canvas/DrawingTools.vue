<template>
  <div class="flex gap-2 justify-between items-center">
    <div>
      <PaintBrushIcon
        v-if="!isActive"
        title="Draw annotations"
        @click="isActive = true"
        class="h-4 w-4 cursor-pointer"
        role="button"
      />
      <XCircleIcon
        v-else
        title="Close drawing tools"
        @click="isActive = false"
        class="h-4 w-4 cursor-pointer"
        role="button"
      />
    </div>
    <div v-if="isActive" class="flex gap-2 items-center">
      <div @click="selectedTool = 'pencil'">
        <PencilIcon title="Pencil tool" class="h-4 w-4 cursor-pointer" role="button" />
      </div>
      <div class="flex items-center gap-1">
        <div
          v-for="color in colors"
          :key="color"
          @click="selectedColor = color"
          class="rounded-full h-3 w-3 cursor-pointer" :style="{ backgroundColor: color }"
          :class="{
            'h-4 w-4': selectedColor === color,
            'h-3 w-3': selectedColor !== color
            }"
          role="button"
        ></div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { PaintBrushIcon, PencilIcon, XCircleIcon } from "@heroicons/vue/24/outline";
import type { DrawingToolType, DrawingToolConfig } from './types';

const emit = defineEmits<{
  (e: 'selectTool', config?: DrawingToolConfig): unknown;
}>();

const colors = [
  '#fcb315',
  '#e74a3c',
  '#000',
  '#fff'
];

const isActive = defineModel<boolean>("active", { default: false });
const selectedTool = ref<DrawingToolType>('pencil');
const selectedColor = ref<string>(colors[0]);

const currentConfig = computed<DrawingToolConfig|undefined>(() => {
  if (!isActive.value) return undefined;
        
  switch (selectedTool.value) {
    case 'pencil':
      return {
        type: 'pencil',
        config: {
          strokeColor: selectedColor.value,
          strokeWidth: 5,
        }
      };
  };
});

watch(currentConfig, () => {
  emit('selectTool', currentConfig.value);
});

</script>