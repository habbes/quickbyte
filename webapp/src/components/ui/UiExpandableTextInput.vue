<template>
  <div class>
    <div v-if="label">
      <label class="text-xs" :for="id">
        {{ label }}
      </label>
    </div>
    <div ref="wrapperEl" class="grow-wrap">
      <textarea ref="inputEl" rows="1" v-model="model" :id="id" :type="type || 'text'" :placeholder="placeholder"
        :required="required"
        class="resize-none flex-1 bg-transparent border ring-indigo-400 ring-1 px-4 py-2 rounded-md outline-none focus:ring-2"
        :class="classes"
        @input="updateInputHeight()"
      >
      </textarea>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';

// TODO: this component has a bug, when a word is too long,
// text textarea grows indefinitely wide

type TextInputType = 'text' | 'email' | 'password';

const props = defineProps<{
  placeholder?: string;
  label?: string;
  id?: string;
  fullWidth?: boolean;
  type?: TextInputType;
  required?: boolean;
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
.grow-wrap > textarea {
  /* You could leave this, but after a user resizes, then it ruins the auto sizing */
  resize: none;

  /* Firefox shows scrollbar on growth, you can hide like this. */
  overflow: hidden;
}
.grow-wrap > textarea,
.grow-wrap::after {
  /* Identical styling required!! */
  border: 1px solid black;
  padding: 0.5rem;
  font: inherit;

  /* Place on top of each other */
  grid-area: 1 / 1 / 2 / 2;
}

.grow-wrap > textarea,
.grow-wrap::after {
  overflow-wrap: break-word;
  word-wrap: break-word;
}
</style>