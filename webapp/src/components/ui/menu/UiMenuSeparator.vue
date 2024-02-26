<template>
  <DropdownMenuSeparator class="m-[5px]" />
</template>
<script lang="ts" setup>
import {
  DropdownMenuSeparator
} from 'radix-vue';

defineProps<{
  disabled?: boolean;
}>();
</script>