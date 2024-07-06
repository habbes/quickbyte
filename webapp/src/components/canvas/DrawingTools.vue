<template>
  <div
    class="flex gap-3 flex-row items-center transition-all ease-in-out"
    :class="{
      'bg-slate-800 rounded-xl px-2 py-[2px] shadow-md': true
    }"
  >
    <div>
      <div
        v-if="!isActive"
        @click="isActive = true"
        role="button"
        title="Attach drawn annotations to the comment"  
      >
        <PaintBrushIcon
          class="h-4 w-4 cursor-pointer"
        />
      </div>
      <div
        v-else
        title="Clear annotations"
        @click="isActive = false"
        role="button"
      >
      <XMarkIcon
        class="h-4 w-4 cursor-pointer"
      />
      </div>
    </div>
    <div v-if="isActive" class="flex gap-3 items-center">
      <div class="flex items-center gap-1">
        <div
          @click="selectedTool = 'pencil'" title="Draw an arbitrary a line"
        >
          <PencilIcon class="h-3 w-3 cursor-pointer" role="button" />
        </div>
        <div
          @click="selectedTool = 'circle'" title="Draw a circle"
          class="h-3 w-3 cursor-pointer border rounded-full"
          role="button"
        >
        </div>
        <div
          @click="selectedTool = 'rect'" title="Draw a rectangle"
          class="h-3 w-3 cursor-pointer border rounded-sm"
          role="button"
        >
        </div>
      </div>
      <div class="flex items-center gap-1">
        <div
          v-for="color in colors"
          :key="color"
          @click="selectedColor = color"
          :class="{
            'rounded-full p-[1px] border': selectedColor === color
          }"
          :style="{ borderColor: selectedColor === color ? color : 'auto' }"
          title="Switch to this color"
        >
          <div
            class="rounded-full h-3 w-3 cursor-pointer" :style="{ backgroundColor: color }"
            
            role="button"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { PaintBrushIcon, PencilIcon, XMarkIcon } from "@heroicons/vue/24/outline";
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
    case 'circle':
      return {
        type: 'circle',
        config: {
          strokeColor: selectedColor.value,
          strokeWidth: 5,
        }
      }
  };
});

watch(currentConfig, () => {
  emit('selectTool', currentConfig.value);
});

</script>