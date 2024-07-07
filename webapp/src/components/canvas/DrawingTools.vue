<template>
  <div
    class="flex flex-row items-center justify-between transition-all ease-in-out"
    :class="{
      'bg-slate-800 rounded-xl px-2 py-[2px] shadow-md': true,
      'w-full': isActive
    }"
  >
    <!-- open close container -->
    <div
      class="flex items-center"
    >
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
    <!-- end open close container -->
    <!-- shape selectors -->
    <div v-if="isActive" class="flex items-center gap-3">
      <div
        @click="selectedTool = 'pencil'" title="Draw an arbitrary a line."
        role="button"
        :class="{
          'h-4 w-4 border rounded-full inline-flex items-center justify-center p-[2px]': selectedTool === 'pencil',
        }"
        
      >
        <PencilIcon
          :class="{
            'h-3 w-3': selectedTool !== 'pencil',
            'h-2 w-2': selectedTool === 'pencil'
          }"
        />
      </div>
      <div
        @click="selectedTool = 'rect'" title="Draw a rectangle."
        role="button"
        :class="{
          'h-4 w-4 border rounded-full inline-flex items-center justify-center p-[1px]': selectedTool === 'rect',
        }"
      >
        <div
          class="cursor-pointer border rounded-sm"
          :class="{ 'h-2 w-2': selectedTool === 'rect', 'h-3 w-3': selectedTool !== 'rect' }"
        >
        </div>
      </div>
      <div
        @click="selectedTool = 'line'" title="Draw a straight line."
        role="button"
        :class="{
          'h-4 w-4 border rounded-full inline-flex items-center justify-center p-[1px]': selectedTool === 'line',
        }"
      >
        <div
          @click="selectedTool = 'line'"
          class="h-[1px] cursor-pointer border -rotate-45"
          :class="{
            'w-3': selectedTool !== 'line',
            'w-2': selectedTool === 'line'
          }"
        />
      </div>
      <div
        @click="selectedTool = 'text'" title="Write text directly on the frame."
        role="button"
        :class="{
          'h-4 w-4 border rounded-full inline-flex items-center justify-center p-[1px]': selectedTool === 'text',
        }"
      >
        <div
          @click="selectedTool = 'line'"
          class="cursor-pointer font-serif text-xs w-2"
        >
         T
        </div>
      </div>
    </div>
    <!-- end shape selectors -->
    <!-- color selectors -->
    <div v-if="isActive" class="flex items-center gap-3">
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
    <!-- end color selectors -->
    <!-- undo/redo -->
    <div v-if="isActive" class="flex items-center gap-3">
      <div @click="$emit('undo')" class="cursor-pointer" role="button" title="Undo shape">
        <ArrowUturnLeftIcon class="h-3 w-3 hover:text-white" />
      </div>
      <div @click="$emit('redo')" class="cursor-pointer" role="button" title="Redo shape">
        <ArrowUturnRightIcon class="h-3 w-3 hover:text-white" />
      </div>
    </div>
    <!-- end undo/redo -->
  </div>
</template>
<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { PaintBrushIcon, PencilIcon, XMarkIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon } from "@heroicons/vue/24/outline";
import type { DrawingToolType, DrawingToolConfig } from './types';

const emit = defineEmits<{
  (e: 'selectTool', config?: DrawingToolConfig): unknown;
  (e: 'undo'): unknown;
  (e: 'redo'): unknown;
}>();

const colors = [
  '#34a3db',
  '#1abca1',
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

  return {
    type: selectedTool.value,
    config: {
      strokeColor: selectedColor.value,
      strokeWidth: 5,
    }
  };
});

watch(currentConfig, () => {
  emit('selectTool', currentConfig.value);
});

</script>