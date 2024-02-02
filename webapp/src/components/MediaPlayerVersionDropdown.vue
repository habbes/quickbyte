<template>
  <UiMenu>
    <template #trigger>
      <slot>
        <ChevronDownIcon class="h-5 w-5" />
      </slot>
    </template>
    <UiMenuItem v-if="uploadState === 'progress' && versionTransfer" disabled>
      <UiLayout horizontal gapSm itemsCenter>
        <ArrowUpIcon class="h-4 w-4" />
        <span>Uploading {{ formatPercentage(uploadProgress, versionTransfer.totalSize) }}</span>
      </UiLayout>
    </UiMenuItem>
    <UiMenuItem v-else @click="openFilePicker()">
      <UiLayout horizontal gapSm itemsCenter>
        <ArrowUpIcon class="h-4 w-4" />
        <span>Upload new version</span>
      </UiLayout>
    </UiMenuItem>
    <UiMenuItem
      v-for="(version, index) in media.versions"
      @click="selectVersion(version._id)"
    >
      <UiLayout horizontal itemsCenter justifyBetween fullWidth>
        <UiLayout horizontal fill gapSm itemsCenter class="overflow-hidden" :title="version.name">
          <span class="text-gray-500">v{{ index + 1 }}</span>
          <span class="overflow-hidden whitespace-nowrap text-ellipsis">{{ version.name }}</span>
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
import { useFileTransfer, useFilePicker, showToast } from "@/app-utils";
import { computed, watch } from "vue";
import { formatPercentage, pluralize } from "@/core";

const props = defineProps<{
  media: Media,
  selectedVersionId?: string;
}>();

const emit = defineEmits<{
  (e: 'versionUpload', updatedMedia: Media): void;
  (e: 'selectVersion', versionId: string): void;
}>();

const {
  onFilesSelected,
  openFilePicker,
  reset
} = useFilePicker();
const { startTransfer, media: uploadedMedia, uploadState, uploadProgress, transfer: versionTransfer } = useFileTransfer();

const updatedVersions = computed(() => {
  if (!uploadedMedia.value || !uploadedMedia.value.length) return [];
  return uploadedMedia.value[0].versions;
});

watch([uploadState], () => {
  if (uploadState.value === 'complete' && uploadedMedia.value && uploadedMedia.value.length) {
    emit('versionUpload', uploadedMedia.value[0])
  }
});

// TODO: initiate transfer
onFilesSelected((selectedFiles, selectedDirectories) => {
  reset();
  showToast(`Uploading ${selectedFiles.length} new ${pluralize('version', selectedFiles.length)}`, 'info');
  startTransfer({
    projectId: props.media.projectId,
    mediaId: props.media._id,
    files: selectedFiles,
    directories: selectedDirectories,
  })
});

function selectVersion(id: string) {
  emit('selectVersion', id);
}
</script>