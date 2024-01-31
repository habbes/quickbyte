<template>
  <UiMenu>
    <template #trigger>
      <slot>
        <ChevronDownIcon class="h-5 w-5" />
      </slot>
    </template>
    <UiMenuItem @click="openFilePicker()">
      <UiLayout horizontal gapSm itemsCenter>
        <ArrowUpIcon class="h-4 w-4" />
        <span>Upload new version</span>
      </UiLayout>
    </UiMenuItem>
    <UiMenuItem
      v-for="(version, index) in media.versions"
    >
      <UiLayout horizontal itemsCenter justifyBetween fullWidth>
        <UiLayout horizontal fill gapSm itemsCenter>
          <span class="text-gray-500">v{{ index + 1 }}</span>
          <span>{{ version.name }}</span>
        </UiLayout>
        <CheckIcon v-if="version._id === selectedVersionId" class="h-4 w-4" />
      </UiLayout>
    </UiMenuItem>
  </UiMenu>
</template>
<script lang="ts" setup>
import type { Media } from "@quickbyte/common";
import { UiLayout, UiMenu, UiMenuItem } from "@/components/ui";
import { CheckIcon, ArrowUpIcon, ChevronDownIcon } from "@heroicons/vue/24/solid";
import { useFileTransfer, useFilePicker, startFileTransfer } from "@/app-utils";

const props = defineProps<{
  media: Media,
  selectedVersionId?: string;
}>();

const {
  files,
  onFilesSelected,
  openFilePicker,
} = useFilePicker();
const {  } = useFileTransfer();

// TODO: initiate transfer
</script>