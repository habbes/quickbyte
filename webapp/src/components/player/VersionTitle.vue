<template>
  <div class="max-w-[200px] sm:max-w-max overflow-hidden text-ellipsis flex gap-1 sm:gap-2 items-center">
    <span class="sm:hidden text-gray-400 text-xs">v{{ versionIndex + 1 }}</span>
    <span class="hidden sm:inline text-gray-400 text-xs">version {{ versionIndex + 1 }}</span>
    <span
      :title="selectedVersion?.name"
      class="text-white text-md overflow-hidden whitespace-nowrap"
    >
      {{ selectedVersion?.name }}
    </span>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed } from "vue";
import type { MediaVersion } from "@quickbyte/common";
import { ensure } from "@/core";

const props = defineProps<{
  versions: MediaVersion[];
  selectedVersionId: string;
}>();


const versionIndex = computed(() => props.versions.findIndex(v => v._id === props.selectedVersionId));
const selectedVersion = computed(() => ensure(props.versions[versionIndex.value]));
</script>