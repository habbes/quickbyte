<template>
  <Popover class="relative">
    <PopoverButton>
      <slot name="trigger"></slot>
    </PopoverButton>
    <PopoverOverlay class="fixed inset-0 bg-black opacity-30" />

    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <PopoverPanel
        class="fixed top-24 bottom-0 sm:top-auto sm:bottom-auto sm:bg-auto h-screen sm:h-auto sm:absolute z-10 mt-3 w-screen sm:w-72  transform sm:px-4 lg:max-w-3xl"
        :class="{ 'right-0': right, 'left-0 sm:translate-x-[-30%]': !right }"
      >
        <div class="h-full overflow-hidden rounded-t-lg sm:rounded-lg shadow-lg ring-1 ring-black/5">
          <div class="content relative bg-white h-full overflow-y-auto">
            <slot></slot>
          </div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>
<script lang="ts" setup>
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  PopoverOverlay
} from '@headlessui/vue';

defineProps<{
  right?: boolean;
}>();
</script>
<style scoped>
.content {
  max-height: calc(100dvh - 6rem);
  overflow-y: auto;
}

@media (min-width: 640px) {
  .content {
    max-height: 400px;
  }
}
</style>
