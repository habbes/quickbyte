<template>
  <div
    class="absolute text-wrap overflow p-0"
    :style="{
      left: `${config.x}px`,
      top: `${config.y}px`,
      width: `${config.width + 2}px`,
      fontSize: `${config.fontSize}px`,
      fontFamily: config.fontFamily,
      color: config.color
    }"
  >
    <textarea
      ref="input"
      class="p-0 bg-transparent border-[1px] outline-none resize-x h-auto"
      :value="config.text"
      @input="updateShape({ text: ($event.target as HTMLTextAreaElement).value})"
      @blur="$emit('done')"
      @keyup.stop=""
      @keydown.stop=""
    >
    </textarea>
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted } from "vue";
import type { FrameAnnotationText } from "@quickbyte/common";

const props = defineProps<{
  config: FrameAnnotationText
}>();

const emit = defineEmits<{
  (e: 'update', updatedConfig: FrameAnnotationText): unknown;
  (e: 'done'): unknown;
}>();

const input = ref<HTMLTextAreaElement>();
const sizeObserver = new ResizeObserver((entries) => {
  const entry = entries.find(e => e.target === input.value);
  if (!entry) {
    return;
  }

  console.log('update width', entry.contentRect.width);
  updateShape({ width: entry.contentRect.width });
});

onMounted(() => {
  input.value?.focus();
  if (input.value) {
    console.log('observer input', input.value);
    sizeObserver.observe(input.value);
  }
});

onMounted(() => {
  sizeObserver.disconnect();
});

function updateShape(args: Partial<FrameAnnotationText>) {
  emit('update', { ...props.config, ...args });
}
</script>