<template>
  <div>
    <div v-if="label">
      <label class="text-xs" :for="id">
        {{ label }}
      </label>
    </div>
    <div>
      <input
        type="datetime-local"
        :id="id"
        :value="dateString"
        @change="handleChange($event)"
        :required="required"
        :disabled="disabled"
        :min="minString"
        :max="maxString"
      />
    </div>
    <div v-if="error" class="text-xs text-red-500">
      {{ error }}
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed } from "vue";
import { DateTime } from "luxon";

const DATE_TIME_FORMAT = "yyyy-MM-dd'T'T";

const props = defineProps<{
  id?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  min?: Date;
  max?: Date;
  error?: string;
}>();

const date = defineModel<Date>();
const id = ref(props.id || `input_${Math.ceil(Math.random() * 10000)}`);
const dateString = computed(() => 
  date.value ? DateTime.fromJSDate(date.value).toFormat(DATE_TIME_FORMAT) : undefined);

const minString = computed(() =>
  props.min ? DateTime.fromJSDate(props.min).toFormat(DATE_TIME_FORMAT) : undefined);

const maxString = computed(() =>
  props.max ? DateTime.fromJSDate(props.max).toFormat(DATE_TIME_FORMAT) : undefined);

function handleChange(event: Event) {
  const rawValue = (event.target as HTMLInputElement).value;
  date.value = DateTime.fromFormat(rawValue, DATE_TIME_FORMAT).toJSDate();
}
</script>