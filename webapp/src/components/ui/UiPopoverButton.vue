<template>
  <!-- This component is used inside Popovers to wrap elements that should
  close the popover menu when clicked -->
  <PopoverButton as="div">
    <slot></slot>
  </PopoverButton>
</template>
<script lang="ts" setup>
  import { PopoverButton } from '@headlessui/vue';
</script>