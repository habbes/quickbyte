<template>
    <button type="button"
        class="inline-flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-medium text-white bg-[#5B53FF] rounded-md shadow-sm lg:w-auto hover:bg-[#5237F9] transition-all duration-200 ease-in">
        {{ props.label }}
    </button>
</template>
<script setup lang="ts">
const props = defineProps<{
    label: string
}>()
</script>