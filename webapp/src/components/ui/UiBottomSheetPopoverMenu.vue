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
        class="fixed top-24 sm:top-auto left-0 h-screen sm:h-auto sm:absolute z-10 mt-3 w-screen sm:w-72  sm:translate-x-[-30%] transform sm:px-4 lg:max-w-3xl"
      >
        <div class="h-full overflow-hidden rounded-t-lg sm:rounded-lg shadow-lg ring-1 ring-black/5">
          <div class="relative bg-white h-full">
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
</script>
