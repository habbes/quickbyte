<template>
  <UiDialog
    ref="dialog"
    :title="`${media.name} versions`"
  >
    <UiLayout>
      <UiLayout gapSm>
        <UiLayout v-if="allowUpload">
          <div v-if="uploadState === 'progress'"
            class=" h-[55px] flex flex-col justify-center items-center border-gray-200 text-gray-600 border-2 border-dashed rounded-md"
          >
            <div>
              <span>
                Uploading {{ percentageUploaded.toFixed(2) }}% 
              </span>
              <span v-if="versionTransfer">
                ({{ humanizeSize(uploadProgress) }} / {{ humanizeSize(versionTransfer.totalSize) }})
              </span>
            </div>
            <div class="text-xs">
              Upload will continue in the background if you close this dialog.
            </div>
          </div>
          <div ref="dropzone"
            @click="openFilePicker()"
            v-else
            class="p-4 h-[55px] text-gray-500 border-gray-200 border-dashed rounded-md flex items-center justify-center cursor-pointer"
            :class="{ 'border-4': isOverDropZone, 'border-2': !isOverDropZone }"
          >
            <UiLayout v-if="!isOverDropZone" horizontal  gapSm>
              <ArrowUpCircleIcon class="h-5 w-5" />
              <span>Upload new versions</span>
            </UiLayout>
            <UiLayout v-else="isOverDropZone" horizontal>
              <span class="text-lg">Drop files to upload new versions</span>
            </UiLayout>
          </div>
        </UiLayout>
        <UiLayout class="h-[250px] overflow-y-auto">
          <UiLayout gapSm>
            <div
              v-for="(version, index) in filteredVersions"
              :key="version._id"
              class="p-2 border border-gray-200 rounded-md w-full"
            >
              <UiLayout horizontal gapMd>
                <UiLayout class="items-center justify-center">
                  <span class="text-gray-500">v{{ getVersionNumber(index, filteredVersions.length) }}</span>
                </UiLayout>
                <UiLayout class="gap-1" fill>
                  <UiLayout>
                    {{ version.name }}
                  </UiLayout>
                  <UiLayout class="text-xs text-gray-500">
                    {{ formatDateTime(version._createdAt) }}
                  </UiLayout>
                </UiLayout>
                <UiLayout horizontal gapSm>
                  <UiLayout itemsCenter justifyCenter>
                    <UiLayout v-if="preferredVersionId === version._id" title="Set as current version">
                      <SolidStarIcon class="h-5 w-5 text-indigo-500" />
                    </UiLayout>
                    <UiLayout v-else title="Set as current version">
                      <StarIcon
                        @click="preferredVersionId = version._id"
                        class="h-5 w-5 text-gray-500 cursor-pointer"
                      />
                    </UiLayout>
                  </UiLayout>
                  <UiLayout v-if="canDelete" itemsCenter justifyCenter title="Delete version">
                    <TrashIcon
                      @click="markForDeletion(version._id)"
                      class="h-5 w-5 text-gray-500 cursor-pointer"
                    />
                  </UiLayout>
                </UiLayout>
              </UiLayout>
            </div>
          </UiLayout>
        </UiLayout>

      </UiLayout>

      <UiLayout horizontal justifyEnd gapSm class="mt-4">
        <UiButton @click="close()">
          Cancel
        </UiButton>
        <UiButton primary @click="save()">
          Save
        </UiButton>
      </UiLayout>

    </UiLayout>
    
  </UiDialog>
</template>
<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { ArrowUpCircleIcon, StarIcon } from "@heroicons/vue/24/outline";
import { StarIcon as SolidStarIcon, TrashIcon } from "@heroicons/vue/24/solid";
import { UiDialog, UiLayout, UiButton } from "@/components/ui";
import type { Media, UpdateMediaVersionsArgs } from "@quickbyte/common";
import { formatDateTime, humanizeSize } from "@/core";
import { showToast, trpcClient, wrapError, useFilePicker, useFileTransfer } from "@/app-utils";

const props = defineProps<{
  media: Media,
  allowUpload: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', updatedMedia: Media): unknown;
}>();

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();
const dropzone = ref<HTMLDivElement>();
const preferredVersionId = ref(props.media.preferredVersionId);
const versionsToDelete = ref(new Set<string>());

const {
  onFilesSelected,
  openFilePicker,
  reset,
  useDropZone
} = useFilePicker();
const { isOverDropZone } = useDropZone(dropzone);
const {
  startTransfer,
  media: uploadedMedia,
  uploadState,
  uploadProgress,
  percentageUploaded,
  transfer: versionTransfer,
} = useFileTransfer();

onFilesSelected((selectedFiles, selectedDirectories) => {
  startTransfer({
    projectId: props.media.projectId,
    mediaId: props.media._id,
    files: selectedFiles,
    directories: selectedDirectories
  });
});

const filteredVersions = computed(() => {
  // versions are sorted from lowest to highest, but we want to display them in reverse order
  const filtered = props.media.versions.filter(v => !versionsToDelete.value.has(v._id));
  const sorted = filtered.reverse();
  return sorted;
});

const canDelete = computed(() => {
  return filteredVersions.value.length > 1
});


watch(() => props.media, () => {
  preferredVersionId.value = props.media.preferredVersionId;
});


function markForDeletion(versionId: string) {
  if (!canDelete.value) {
    return;
  }
  versionsToDelete.value.add(versionId);

  if (versionId === preferredVersionId.value) {
    // deleting preferred version, set another version
    // as preferred
    preferredVersionId.value = filteredVersions.value[0]._id;
  }
}

function getVersionNumber(index: number, length: number) {
  // we sort versions from highest to lowest
  return length - index;
}

function open() {
  versionsToDelete.value = new Set();
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}

function save() {
  return wrapError(async () => {
    const args: UpdateMediaVersionsArgs = {
      projectId: props.media.projectId,
      mediaId: props.media._id,
      preferredVersionId: preferredVersionId.value,
      concurrencyControl: props.media._cc
    };

    if (preferredVersionId.value !== props.media.preferredVersionId) {
      args.preferredVersionId = preferredVersionId.value
    }

    if (filteredVersions.value.length !== props.media.versions.length) {
      // some versions have been deleted
      args.versions = filteredVersions.value.map(v => ({ _id: v._id, name: v.name }));
    }


    const result = await trpcClient.updateMediaVersions.mutate(args);
    emit('update', result);
    showToast('Versions have been updated successfully.', 'info');
    close();
  })
}
</script>