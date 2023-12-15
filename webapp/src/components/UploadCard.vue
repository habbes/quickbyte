<template>
  <div class="card w-96 bg-base-100 shadow-xl">
    <!-- initial state -->
    <div class="card-body" v-if="uploadState === 'initial' && !transferDetails">
      <h2 class="card-title">Transfer files</h2>
      <Button @click="openFilePicker()" class="">Select files to upload</Button>
      <Button v-if="directoryPickerSupported" @click="openDirectoryPicker()" class="">Select folder to upload</Button>
    </div>

    <!-- file selected -->
    <div class="card-body" v-if="uploadState === 'initial' && transferDetails">
      <h2
        v-if="!editingTransferName"
        class="card-title overflow-hidden text-ellipsis whitespace-nowrap flex justify-between"
        :title="transferDetails.name"
      >
        <span class="text-ellipsis">{{ transferDetails.name  }}</span>
        <span
          title="Edit title"
          @click="toggleTransferNameEditing()"
          class="cursor-pointer"
        >
          <PencilIcon class="w-4 h-4" />
        </span>
      </h2>
      <h2
        v-else
        class="card-title overflow-hidden text-ellipsis whitespace-nowrap flex justify-between"
        :title="transferDetails.name"
      >
        <input v-model="transferName" class="border-b border-b-gray-200 outline-none flex-1" />
        <span
          title="Finish editing title"
          @click="toggleTransferNameEditing()"
          class="cursor-pointer"
        >
          <CheckIcon class="w-4 h-4" />
        </span>
      </h2>
      <div>
        <div ref="fileListContainer" class="h-60 overflow-auto">
          <UploadListFolderItem
            v-for="dir in directories"
            :key="dir.name"
            :name="dir.name"
            :numFiles="dir.totalFiles"
            :totalSize="dir.totalSize"
            @remove="removeDirectory(dir.name)"
          />
          <UploadListFileItem
            v-for="file in rootFiles"
            :key="file.path"
            :name="file.path"
            :size="file.file.size"
            @remove="removeFile(file.path)"
          />
        </div>
      </div>
      <p class="flex justify-between content-center mt-2">
        <span class="text-gray-400">{{ files?.length }} files - {{  humanizeSize(transferDetails.totalSize) }}</span>
        <AddFilesDropDown @addFiles="openFilePicker()" @addFolder="openDirectoryPicker()" />
      </p>
      <div class="card-actions justify-center mt-4">
        <button class="btn btn-primary flex-1" @click="startUpload()">Upload</button>
        <button class="btn" @click="resetState()">Cancel</button>
      </div>
    </div>

    <!-- upload in progress -->
    <div class="card-body" v-if="uploadState === 'progress' && transferDetails">
      <h2 class="card-title">{{ transferDetails.name }}</h2>
      <div class="flex justify-center">
        <div
          class="radial-progress bg-primary text-primary-content border-4 border-primary" style="--value:70;"
          :style="{ '--value': Math.floor(100 * uploadProgress / transferDetails.totalSize )}">
            {{ Math.floor(100 * uploadProgress / transferDetails.totalSize )}}%
          </div>
      </div>
      <p class="text-gray-400 text-center">
        {{ humanizeSize(uploadProgress) }} / {{ humanizeSize(transferDetails.totalSize) }} <br>
      </p>
    </div>

    <!-- upload complete -->
    <div class="card-body" v-if="uploadState === 'complete' && transferDetails">
      <h2 class="card-title">Upload complete!</h2>
      <p>Copy and share the <a class="link" :href="downloadUrl" target="_blank">download link</a> with the recipients:</p>
      <div class="relative mb-6" @click="copyDownloadUrl()">
        <div class="absolute left-0 right-0 overflow-auto border p-2 rounded-md">
          {{ downloadUrl }}
        </div>
      </div>
      <div class="card-actions justify-center mt-4">
        <button v-if="!copiedDownloadUrl" class="btn btn-primary w-full" @click="copyDownloadUrl()">Copy link</button>
        <button v-if="copiedDownloadUrl" class="btn btn-primary w-full" @click="resetState()">Send another file</button>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useClipboard } from '@vueuse/core';
import { ref, computed, watch } from "vue";
import { PencilIcon, CheckIcon } from "@heroicons/vue/24/outline";
import { useFilePicker, showToast, useFileTransfer } from '@/app-utils';
import { humanizeSize } from "@/core";
import Button from "@/components/Button.vue";
import UploadListFileItem from './UploadListFileItem.vue';
import UploadListFolderItem from './UploadListFolderItem.vue';
import AddFilesDropDown from './AddFilesDropdown.vue';

const {
  openDirectoryPicker,
  openFilePicker,
  onError: onFilePickerError,
  directoryPickerSupported,
  files,
  directories,
  removeFile,
  removeDirectory,
  reset
} = useFilePicker();
const { copy } = useClipboard();

onFilePickerError((e) => {
  showToast(e.message, 'error');
});

const transferName = ref<string>();
const editingTransferName = ref(false);

function toggleTransferNameEditing() {
  if (!editingTransferName.value) {
    editingTransferName.value = true;
  } else if (transferName.value) {
    editingTransferName.value = false;
  }
}

const transferDetails = computed(() =>
  (files.value.length > 0 || null) && {
    name: transferName.value,
    totalSize: files.value.map(f => f.file.size).reduce((a, b) => a + b)
  });

// files that are not in a folder
const rootFiles = computed(() =>
  Array.from(files.value.values()).filter(f => !f.path.includes('/')));


const {
  uploadProgress,
  uploadState,
  downloadUrl,
  error,
  startTransfer
} = useFileTransfer();
// const uploadProgress = ref<number>(0);
// const uploadState = ref<UploadState>('initial');
// const downloadUrl = ref<string|undefined>();
const copiedDownloadUrl = ref<boolean>(false);
const fileListContainer = ref<HTMLDivElement>();

watch([error], () => {
  if (error.value) {
    showToast(error.value.message, 'error')
  }
});

watch([files], () => {
  if (!files.value.length) {
    return;
  }

  if (!transferName.value) {
    transferName.value = directories.value.length && directories.value[0].name || files.value[0].file.name;
  }

  if (!fileListContainer.value) return;
  // TODO: this doesn't seem to work properly
  fileListContainer.value.scrollTo(0, fileListContainer.value.scrollHeight);
});

function resetState() {
  reset();
  downloadUrl.value = undefined;
  uploadState.value = 'initial';
  uploadProgress.value = 0;
  copiedDownloadUrl.value = false;
}

function copyDownloadUrl() {
  if (!downloadUrl.value) return;

  copy(downloadUrl.value);
  copiedDownloadUrl.value = true;
}

async function startUpload() {
  if (!files.value.length) return;
  if (!transferDetails.value || !transferDetails.value.name) return;

  await startTransfer({
    files: files.value,
    directories: directories.value,
    name: transferDetails.value.name 
  });
}
</script>