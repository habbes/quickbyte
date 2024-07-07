<template>
  <div
    class="absolute text-wrap overflow p-0"
    :style="{
      left: `${config.x}px`,
      top: `${config.y}px`,
      width: `${config.width + 2}px`,
      fontSize: `${config.fontSize}px`,
      fontFamily: config.fontFamily,
      fontWeight: config.fontStyle === 'bold' ? 'bold' : 'normal',
      color: config.color
    }"
  >
    <div
      class="absolute opacity-50 -z-10"
      :style="{
        backgroundColor: config.backgroundColor || 'transparent',
        ...textBgStyle
      }"
    ></div>
    <UiExpandableBareTextInput
      ref="input"
      :modelValue="config.text"
      @input="updateShape({ text: ($event.target as HTMLTextAreaElement).value})"
      @blur="onTextAreaBlur($event)"
      @keyup.stop="handleKeyUp($event)"
      @keydown.stop=""
      @sizeChange="textBgHeight = $event.height"
    />
    <div class="bg-slate-800 w-full py-1 px-2 shadow-sm rounded-sm text-white flex items-center justify-evenly gap-2 mt-1 z-10">
      <div
        @click="updateAndFocus({ fontStyle: 'normal' })"
        :style="{ fontWeight: 'normal' }"
        class="cursor-pointer text-gray-200"
        :class="{
          'text-white': config.fontStyle === 'normal'
        }"
        title="Make text normal."
        role="button"
      >
        Aa
      </div>
      <div
        @click="updateAndFocus({ fontStyle: 'bold' })"
        :style="{ fontWeight: 'bold' }"
        class="cursor-pointer text-gray-200"
        :class="{
          'text-white': config.fontStyle === 'bold'
        }"
        title="Make text bold."
        role="button"
      >
        Aa
      </div>
      <div
        class="text-gray-200 h-full text-sm px-[1px] cursor-pointer"
        :style="{ backgroundColor: !isTransparent(config.backgroundColor) ? 'transparent' : config.color }"
        @click="updateAndFocus({
          backgroundColor: !isTransparent(config.backgroundColor) ? 'transparent' : config.color,
          color: isTransparent(config.backgroundColor) ? 'white' : config.color
        })"
        title="Invert colors"
        role="button"
      >
        Aa
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, computed } from "vue";
import type { FrameAnnotationText } from "@quickbyte/common";
import { UiExpandableBareTextInput } from "@/components/ui";

const props = defineProps<{
  config: FrameAnnotationText
}>();

const emit = defineEmits<{
  (e: 'update', updatedConfig: FrameAnnotationText): unknown;
  (e: 'done'): unknown;
}>();

const input = ref<typeof UiExpandableBareTextInput>();
const textBgHeight = ref<number|undefined>();

const textBgStyle = computed(() => {
  if (!textBgHeight.value) {
    return {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0
    };
  }

  return {
    top: 0,
    left: 0,
    right: 0,
    height: `${textBgHeight.value}px`
  }
});

onMounted(() => {
  input.value?.focus();
});

function isTransparent(color?: string) {
  return color === 'transparent' || !color;
}

function updateAndFocus(update: Partial<FrameAnnotationText>) {
  updateShape(update);
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
    e.preventDefault();
    emit('done');
  }
}
</script>