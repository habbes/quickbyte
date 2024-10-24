<template>
  <Icon :icon="icon" />
</template>
<script lang="ts" setup>
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import { type ProjectItem, getMediaType } from "@quickbyte/common";

const props = defineProps<{
  item: ProjectItem
}>();

const icon = computed(() => {
  if (props.item.type === 'folder') {
    return 'lucide:folder';
  }

  const mediaType = getMediaType(props.item.name);
  switch (mediaType) {
    case 'audio':
      return 'lucide:file-audio';
    case 'video':
      return 'lucide:file-video';
    case 'image':
      return 'lucide:file-image';
    default:
      return 'lucide:file';
  }
})
</script>