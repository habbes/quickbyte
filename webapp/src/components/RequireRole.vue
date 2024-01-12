<template>
  <template v-if="accepted.includes(current)">
    <slot></slot>
  </template>
</template>
<script lang="ts" setup>
import type { RoleType } from "@quickbyte/common";

defineProps<{
  accepted: RoleType[],
  current: RoleType
}>()
</script>