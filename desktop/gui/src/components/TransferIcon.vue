<template>
  <Icon :icon="type === 'download' ? 'lucide:arrow-down' : 'lucide:arrow-up'" />
</template>
<script lang="ts" setup>
import { Icon } from '@iconify/vue';
import { type TransferType } from "@/core";

defineProps<{
  type: TransferType
}>();
</script>