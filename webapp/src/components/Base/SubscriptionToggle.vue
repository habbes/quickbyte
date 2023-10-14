<template>
  <div class="flex items-center justify-center">
    <button type="button" class="flex items-center" @click="handleToggleSubscription">
      <label class="min-w-[3.5rem] text-sm text-gray-200 mr-3">Monthly</label>
      <Switch
        v-model="enabled" :class="enabled ? 'bg-[#5B53FF]' : 'bg-black border border-[#181820]'"
        class="relative inline-flex items-center h-6 rounded-full w-11"
      >
        <span
          :class="enabled ? 'translate-x-6' : 'translate-x-1'"
          class="inline-block w-4 h-4 transition transform bg-white rounded-full"
        />
      </Switch>

      <label class="min-w-[3.5rem] text-sm text-gray-200 ml-3">
        Annual
      </label>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Switch } from '@headlessui/vue'

const emit = defineEmits<{
  (e: 'toggle', value: boolean): void
}>()
const enabled = ref(false)
function handleToggleSubscription() {
  return emit('toggle', enabled.value)
}
</script>

