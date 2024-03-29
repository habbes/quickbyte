<template>
  <DropdownMenuSeparator class="m-[5px] border border-slate-100" />
</template>
<script lang="ts" setup>
import {
  DropdownMenuSeparator
} from 'radix-vue';

defineProps<{
  disabled?: boolean;
}>();
</script>