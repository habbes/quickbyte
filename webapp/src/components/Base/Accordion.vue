<template>
  <div
    class="group rounded-xl border border-[#101214] bg-[#010101] transition duration-500  md:rounded-2xl">
    <div @click="toggle" class="flex items-center p-5 cursor-pointer md:p-6">
      <div class="text-base text-[#F1F0EE] transition group-hover:text-white md:text-lg">
        <slot name="title" />
      </div>

      <div class="relative ml-auto">
        <Icon icon="heroicons:x-mark-20-solid"
          :class="{ 'rotate-180': show, 'rotate-45': !show }"
          class="h-5 w-5 text-[#D7D5D1] transition-transform duration-500 md:h-6 md:w-6" />
      </div>
    </div>

    <div
      :style="{
        height: `${height}px`,
      }"
      class="overflow-hidden px-5 transition-[height] duration-500 will-change-[height] md:px-6">
      <div ref="contents" class="space-y-4 pb-5 font-light leading-relaxed tracking-wide text-[#B1AFAD] md:pb-6">
        <slot />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from "vue"
import { useElementSize } from "@vueuse/core"

const show = ref(false)
const contents = ref<HTMLElement>()

const { height: targetHeight } = useElementSize(contents, undefined, {
  box: "border-box",
})

const height = computed(() => (show.value ? targetHeight.value : 0))

const toggle = () => (show.value = !show.value)
</script>

