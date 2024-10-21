<template>
  <div class>
    <div v-if="label">
      <label class="text-xs text-gray-200" :for="id">
        {{ label }}
      </label>
    </div>
    <div>
      <input ref="inputEl" v-model="model" :id="id" :type="type || 'text'" :placeholder="placeholder" :required="required"
        class="flex-1 rounded-sm outline-none" :class="classes" :disabled="disabled">
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';

type TextInputType = 'text' | 'email' | 'password';

const props = defineProps<{
  placeholder?: string;
  label?: string;
  id?: string;
  fullWidth?: boolean;
  type?: TextInputType;
  required?: boolean;
  dark?: boolean;
  hasError?: boolean;
  disabled?: boolean;
  /**
   * When enabled, removes borders and padding
   */
  flat?: boolean;
}>();

defineExpose({ focus });

const model = defineModel();


const inputEl = ref<HTMLInputElement>();
const id = ref(props.id || `input_${Math.ceil(Math.random() * 10000)}`);

const classes = computed(() => {
  return {
    'w-full': props.fullWidth,
    'text-gray-100': !props.dark && !props.disabled,
    'bg-gray-700': !props.dark,
    'text-white bg-transparent': props.dark,
    'border-gray-300 focus:border-blue-400': !props.hasError,
    'focus:border-red-400 border-red-500': props.hasError,
    'px-2 py-1': !props.flat,
    'border-0': props.flat,
    'px-0': props.flat,
    'py-0': props.flat,
    'focus:ring-1 focus:ring-violet-400': !props.flat,
    'focus:border-b focus:rounded-none focus:border-gray-300 focus:px-1': props.flat
  }
});

function focus() {
  inputEl.value?.focus();
}

</script>