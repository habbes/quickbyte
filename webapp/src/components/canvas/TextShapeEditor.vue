<template>
  <div
    class="absolute text-wrap overflow p-0"
    :style="{
      left: `${config.x}px`,
      top: `${config.y}px`,
      width: `${config.width + 2}px`,
      fontSize: `${config.fontSize}px`,
      fontFamily: config.fontFamily,
      color: config.color,
    }"
  >
    <UiExpandableBareTextInput
      ref="input"
      :modelValue="config.text"
      @input="updateShape({ text: ($event.target as HTMLTextAreaElement).value})"
      @blur="onTextAreaBlur($event)"
      @keyup.stop="handleKeyUp($event)"
      @keydown.stop=""
    />
    <div class="bg-slate-800 w-full py-1 px-2 shadow-sm rounded-sm text-white flex items-center gap-3">
      <div
        v-for="fontFamily in FONT_FAMILIES"
        :key="fontFamily"
        @click="handleSelectFont(fontFamily)"
        :style="{ fontFamily }"
        class="cursor-pointer text-gray-200"
        :class="{
          'text-white': config.fontFamily === fontFamily
        }"
        title="Switch to this font."
        role="button"
      >
        Aa
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted } from "vue";
import type { FrameAnnotationText } from "@quickbyte/common";
import { UiExpandableBareTextInput } from "@/components/ui";
import { FONT_FAMILIES } from './canvas-helpers.js';

const props = defineProps<{
  config: FrameAnnotationText
}>();

const emit = defineEmits<{
  (e: 'update', updatedConfig: FrameAnnotationText): unknown;
  (e: 'done'): unknown;
}>();

const input = ref<typeof UiExpandableBareTextInput>();


onMounted(() => {
  input.value?.focus();
});

function handleSelectFont(fontFamily: string) {
  updateShape({ fontFamily });
  input.value?.focus();
}

function updateShape(args: Partial<FrameAnnotationText>) {
  emit('update', { ...props.config, ...args });
}

function onTextAreaBlur(e: FocusEvent) {
  const el = e.target as HTMLTextAreaElement;
  updateShape({ text: el.value, width: el.clientWidth });
  // emit('done');
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    console.log('Enter pressed');
    emit('done');
  }
}
</script>