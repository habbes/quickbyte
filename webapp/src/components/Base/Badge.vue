<template>
  <div class="px-4 py-1 bg-[#5B53FF]/10 text-white text-xs rounded-2xl border border-[#5148ff]">
    {{ props.label }}
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
}>()
</script>
