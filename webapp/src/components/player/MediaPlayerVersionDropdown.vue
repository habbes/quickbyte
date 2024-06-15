<template>
  <UiMenu>
    <template #trigger>
      <slot>
        <ChevronDownIcon class="h-5 w-5" />
      </slot>
    </template>
    <UiMenuItem v-if="allowUpload && uploadState === 'progress' && versionTransfer" disabled>
      <UiLayout horizontal gapSm itemsCenter>
        <ArrowUpIcon class="h-4 w-4" />
        <span>Uploading {{ formatPercentage(uploadProgress, versionTransfer.totalSize) }}</span>
      </UiLayout>
    </UiMenuItem>
    <UiMenuItem v-else-if="allowUpload " @click="openFilePicker()">
      <UiLayout horizontal gapSm itemsCenter>
        <ArrowUpIcon class="h-4 w-4" />
        <span>Upload new version</span>
      </UiLayout>
    </UiMenuItem>

    <UiMenuItem
      v-for="version in versions"
      @click="selectVersion(version.version._id)"
    >
      <UiLayout horizontal itemsCenter justifyBetween fullWidth>
       
        <UiLayout horizontal fill gapSm itemsCenter class="overflow-hidden" :title="version.version.name">
          <span class="text-gray-500">{{ version.code }}</span>
          
          <span class="overflow-hidden whitespace-nowrap text-ellipsis">{{ version.version.name }}</span>
        </UiLayout>
        <StarIcon title="Preferred version" v-if="version.version._id === media.preferredVersionId" class="h-4 w-4 text-slate-300" />
        <CheckIcon v-if="version.version._id === selectedVersionId" class="h-4 w-4" />
        
      </UiLayout>
    </UiMenuItem>

    <UiMenuItem v-if="allowManagement" @click="openDialog()">
      <UiLayout horizontal gapSm itemsCenter>
        <Cog6ToothIcon class="h-4 w-4" />
        <span>Manage versions</span>
      </UiLayout>
    </UiMenuItem>
  </UiMenu>

  <MediaVersionsDialog 
    ref="dialog"
    :media="media"
    :allowUpload="!!allowUpload"
    @update="$emit('update', $event)"
  />
</template>
<script lang="ts" setup>
import { ref } from "vue";
import type { Media } from "@quickbyte/common";
import { UiLayout, UiMenu, UiMenuItem } from "@/components/ui";
import { MediaVersionsDialog } from "@/components/versions";
import { CheckIcon, ArrowUpIcon, ChevronDownIcon, Cog6ToothIcon } from "@heroicons/vue/24/outline";
import { StarIcon } from "@heroicons/vue/24/solid";
import { useFileTransfer, useFilePicker, showToast } from "@/app-utils";
import { computed, watch } from "vue";
import { formatPercentage, pluralize } from "@/core";

const props = defineProps<{
  media: Media,
  selectedVersionId?: string;
  allowUpload?: boolean;
  allowManagement?: boolean;
}>();

const emit = defineEmits<{
  (e: 'versionUpload', updatedMedia: Media): void;
  (e: 'update', updatedMedia: Media): void;
  (e: 'selectVersion', versionId: string): void;
}>();

const {
  onFilesSelected,
  openFilePicker,
  reset
} = useFilePicker();
const { startTransfer, media: uploadedMedia, uploadState, uploadProgress, transfer: versionTransfer } = useFileTransfer();

const dialog = ref<typeof MediaVersionsDialog>();

const updatedVersions = computed(() => {
  if (!uploadedMedia.value || !uploadedMedia.value.length) return [];
  return uploadedMedia.value[0].versions;
});

const versions = computed(() => {
  // sort in descending order, from highest to lowest version
  const reversed = [...props.media.versions].reverse();
  return reversed.map((v, index) => ({
    version: v,
    code: `v${reversed.length - index}`
  }));
});

watch([uploadState], () => {
  if (uploadState.value === 'complete' && uploadedMedia.value && uploadedMedia.value.length) {
    emit('versionUpload', uploadedMedia.value[0])
  }
});

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

function openDialog() {
  dialog.value?.open();
}
</script>