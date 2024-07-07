<template>
  <div class>
    <div v-if="label">
      <label class="text-xs" :for="id">
        {{ label }}
      </label>
    </div>
    <div ref="wrapperEl" class="grow-wrap">
      <textarea
        ref="inputEl"
        rows="1"
        v-model="model"
        :id="id"
        :placeholder="placeholder"
        :required="required"
        class="resize-none flex-1 bg-transparent outline-none border-0 p-0"
        :class="classes"
        style="line-height: 1;"
        @input="handleInputEvent($event)"
        @blur="$emit('blur', $event)"
        @keydown="$emit('keydown', $event)"
        @keyup="$emit('keyup', $event)">
        </textarea>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';

// TODO: this component has a bug, when a word is too long,
// text textarea grows indefinitely wide

const props = defineProps<{
  placeholder?: string;
  label?: string;
  id?: string;
  fullWidth?: boolean;
  required?: boolean;
}>();

const emit = defineEmits<{
  (e: 'input', args: Event): unknown;
  (e: 'blur', args: FocusEvent): unknown;
  (e: 'keydown', args: KeyboardEvent): unknown;
  (e: 'keyup', args: KeyboardEvent): unknown;
}>();

defineExpose({ focus });

const model = defineModel<string>();

const wrapperEl = ref<HTMLDivElement>();
const inputEl = ref<HTMLInputElement>();
const id = ref(props.id || `input_${Math.ceil(Math.random() * 10000)}`);

const classes = computed(() => {
  return {
    'w-full': props.fullWidth,
  }
});

function focus() {
  inputEl.value?.focus();
}

function handleInputEvent(e: Event) {
  updateInputHeight();
  emit('input', e);
}

function updateInputHeight() {
  if (!wrapperEl.value) return;
  if (!inputEl.value) return;

  // see: https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas/
  wrapperEl.value.dataset.replicatedValue = inputEl.value?.value;
}

</script>
<style scoped>
/* see: https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas/ */
.grow-wrap {
  /* easy way to plop the elements on top of each other and have them both sized based on the tallest one's height */
  display: grid;
}

.grow-wrap::after {
  /* Note the weird space! Needed to preventy jumpy behavior */
  content: attr(data-replicated-value) " ";

  /* This is how textarea text behaves */
  white-space: pre-wrap;

  /* Hidden from view, clicks, and screen readers */
  visibility: hidden;
}

.grow-wrap>textarea {
  /* You could leave this, but after a user resizes, then it ruins the auto sizing */
  resize: none;

  /* Firefox shows scrollbar on growth, you can hide like this. */
  overflow: hidden;
}

.grow-wrap>textarea,
.grow-wrap::after {
  /* Identical styling required!! */
  border: 0px;
  padding: 0px;
  font: inherit;
  line-height: 1;

  /* Place on top of each other */
  grid-area: 1 / 1 / 2 / 2;
}

.grow-wrap>textarea,
.grow-wrap::after {
  overflow-wrap: break-word;
  word-wrap: break-word;
}
</style>