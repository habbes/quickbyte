<template>
  <div>Comparer</div>
  <div>{{ v1?.name  }}</div>
  <div>{{ v2?.name }}</div>
</template>
<script lang="ts" setup>
import { computed } from "vue";
import type { MediaWithFileAndComments } from "@quickbyte/common";

const props = defineProps<{
  media: MediaWithFileAndComments,
  version1Id: string;
  version2Id: string;
}>()

const v1 = computed(() => props.media.versions.find(v => v._id === props.version1Id));
const v2 = computed(() => props.media.versions.find(v => v._id === props.version2Id));
</script>