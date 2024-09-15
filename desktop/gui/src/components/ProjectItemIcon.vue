<template>
  <template v-if="props.item.type === 'folder'">
    <Icon icon="lucide:folder" />
  </template>
  <template v-else>
    <Icon icon="lucide:file" />
  </template>
</template>
<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import type { ProjectItem } from "@quickbyte/common";

const props = defineProps<{
  item: ProjectItem
}>();
</script>