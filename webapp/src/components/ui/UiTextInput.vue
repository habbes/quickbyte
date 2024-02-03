<template>
  <div class>
    <div v-if="label">
      <label class="text-xs" :for="id">
        {{ label }}
      </label>
    </div>
    <div>
      <input
        ref="inputEl"
        v-model="model"
        :id="id"
        :type="type || 'text'"
        :placeholder="placeholder"
        :required="required"
        class="flex-1bg-transparent border border-gray-300 px-4 py-2 rounded-md focus:border-blue-400 outline-none focus:ring-1"
        :class="classes"
      >
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue';

type TextInputType = 'text'|'email'|'password';

const props = defineProps<{
  placeholder?: string;
  label?: string;
  id?: string;
  fullWidth?: boolean;
  type?: TextInputType;
  required?: boolean;
}>();

defineExpose({ focus });

const model = defineModel();


const inputEl = ref<HTMLInputElement>();
const id = ref(props.id || `input_${Math.ceil(Math.random() * 10000)}`);

const classes = computed(() => {
  return {
    'w-full': props.fullWidth
  }
});

function focus() {
  inputEl.value?.focus();
}

</script>