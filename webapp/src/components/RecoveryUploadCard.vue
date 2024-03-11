<template>
  <div class="sm:w-96 flex flex-col gap-2">
    <div v-if="!filesMatch && files.length">
      <div class="alert alert-error text-xs">
          Ensure you select all files that were
          part of the recovered transfer
          and do not add files which were not part it.
        </div>
    </div>
    <div class="card sm:w-96 bg-base-100 shadow-xl text-slate-600">
      <!-- initial state -->
      <div class="card-body" v-if="uploadState === 'initial'">
        <div v-if="!filesMatch" class="font-bold text-sm">Select the following files and folders to resume transfer:</div>
        <div v-if="!filesMatch" class="max-h-52 overflow-auto">
          <FolderListItem
            v-for="dir in foldersToRecover"
            :key="dir.name"
            :name="dir.name"
            :numFiles="dir.totalFiles"
            :totalSize="dir.totalSize"
          />
          <FileListItem
            v-for="file in rootFilesToRecover"
            :key="file.path"
            :name="file.path"
            :size="file.size"
          />
        </div>
        <div v-if="files.length" class="font-bold text-sm">Currently selected files</div>
        <div class="max-h-60 overflow-auto">
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
        <div v-if="!filesMatch" class="card-actions flex items-center justify-between">
          <AddFilesDropdown
            buttonText="Select files"
            @addFiles="openFilePicker()"
            @addFolder="openDirectoryPicker()"
          />
        </div>
        <div v-else class="card-actions flex items-center">
          <button v-if="filesMatch" class="btn btn-primary flex-1" @click="startUpload()">Upload</button>
          <button @click="resetStateAndComplete()" class="btn">Cancel</button>
        </div>
      </div>

      <!-- upload in progress -->
      <div class="card-body" v-if="uploadState === 'progress' && files.length && filesMatch">
        <h2 class="card-title">{{ recoveredUpload.name }}</h2>
        <div class="flex justify-center">
          <div
            class="radial-progress bg-primary text-primary-content border-4 border-primary" style="--value:70;"
            :style="{ '--value': Math.floor(100 * uploadProgress / recoveredUpload.totalSize )}">
              {{ Math.floor(100 * uploadProgress / recoveredUpload.totalSize )}}%
            </div>
        </div>
        <p class="text-gray-400 text-center">
          {{ humanizeSize(uploadProgress) }} / {{  humanizeSize(recoveredUpload.totalSize) }} <br>
        </p>
      </div>

      <!-- upload complete -->
      <div class="card-body" v-if="uploadState === 'complete' && files.length">
        <h2 class="card-title">Upload complete!</h2>
        <p>Copy and share the <a class="link" :href="downloadUrl" target="_blank">download link</a> with the recipients:
        </p>
        <div class="relative mb-6" @click="copyDownloadUrl()">
          <div class="absolute left-0 right-0 overflow-auto border p-2 rounded-md">
            {{ downloadUrl }}
          </div>
        </div>
        <div class="card-actions justify-center mt-4">
          <button v-if="!copiedDownloadUrl" class="btn btn-primary w-full" @click="copyDownloadUrl()">Copy link</button>
          <button v-if="copiedDownloadUrl" class="btn btn-primary w-full" @click="resetStateAndComplete()">Send another file</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useClipboard } from '@vueuse/core';
import { ref, computed, watch } from "vue";
import { apiClient, store, uploadRecoveryManager, logger, useFilePicker, showToast, type FilePickerEntry, windowUnloadManager, useFileTransfer } from '@/app-utils';
import { humanizeSize, ensure, ApiError, AzUploader, MultiFileUploader, type TrackedTransfer } from "@/core";
import Button from "@/components/Button.vue";
import FileListItem from '@/components/FileListItem.vue';
import FolderListItem from '@/components/FolderListItem.vue';
import UploadListFolderItem from '@/components/UploadListFolderItem.vue';
import UploadListFileItem from '@/components/UploadListFileItem.vue';
import AddFilesDropdown from '@/components/AddFilesDropdown.vue';

type UploadState = 'initial' | 'fileSelection' | 'progress' | 'complete';

const props = defineProps<{
  uploadId: string;
}>();

const emit = defineEmits<{
  (event: 'complete'): void;
}>();

const {
  openDirectoryPicker,
  openFilePicker,
  getFileByPath,
  getDirectoryByName,
  removeDirectory,
  removeFile,
  onError: onFilePickerError,
  files,
  directories,
  reset
} = useFilePicker();

onFilePickerError((e) => {
  showToast(e.message, 'error');
});

const { copy } = useClipboard();

const rootFiles = computed(() => files.value.filter(f => !f.path.includes('/')));

// We get the recoveredUpload once instead of using a computed() ref because the recoveredUpload will be deleted
// from the store when upload is complete.
const recoveredUpload = ref(ensure(store.recoveredTransfers.value.find(u => props.uploadId === u.id), `Cannot find recovered transfer ${props.uploadId}`));

const unselectedFilesToRecover = computed(() => recoveredUpload.value.files.filter(file => !isFileSelected(file)));
const rootFilesToRecover = computed(() => unselectedFilesToRecover.value.filter(f => !f.path.includes('/')));
const foldersToRecover = computed(() => recoveredUpload.value.directories.filter(folder => !isDirectorySelected(folder)));

const filesMatch = computed(() =>
  files.value && checkRecoveredAndUploadedFilesMatch(recoveredUpload.value, files.value)
);

// const unselectedFilesToRecover = computed(() => recoveredUpload.value.files.filter(file => isFileSelected(file)));

// const uploadProgress = ref<number>(0);
// const uploadState = ref<UploadState>('initial');
// const downloadUrl = ref<string | undefined>();

const {
  uploadProgress,
  uploadState,
  downloadUrl,
  error,
  resumeTransfer
} = useFileTransfer();
const copiedDownloadUrl = ref<boolean>(false);

watch([error], () => {
  if (error.value) {
    showToast(error.value.message, 'error');
  }
});


function resetState() {
  reset();
  downloadUrl.value = undefined;
  uploadState.value = 'initial';
  uploadProgress.value = 0;
  copiedDownloadUrl.value = false;
}

function resetStateAndComplete() {
  resetState();
  emit('complete');
}

function copyDownloadUrl() {
  if (!downloadUrl.value) return;

  copy(downloadUrl.value);
  copiedDownloadUrl.value = true;
}

function checkRecoveredAndUploadedFilesMatch(recovered: TrackedTransfer, files: FilePickerEntry[]): boolean {
  // TODO: check other factors like "lastModified" and "hash"
  // check that every file in TrackedTransfer exists among the upload files
  // we should probably emit a warning when there are new files
  const allFilesToRecoverSelected = recovered.files
    .every(file =>
      files.some(otherFile =>
        otherFile.path === file.path && otherFile.file.size === file.size));
  
  const recoveredFileNames = recovered.files.map(f => f.path);
  const includesUnknownFiles = files.some(file =>
    // We don't check unknown files inside folders.
    // But those files won't be included in the upload.
    !file.path.includes('/')
    && !recoveredFileNames.includes(file.path));
  
  return allFilesToRecoverSelected && !includesUnknownFiles;
}

function isFileSelected(fileToRecover: TrackedTransfer['files'][0]) {
  const selectedFile = getFileByPath(fileToRecover.path);
  return !!(selectedFile && selectedFile.file.size === fileToRecover.size);
}

function isDirectorySelected(folderToRecover: TrackedTransfer['directories'][0]) {
  const selectedFolder = getDirectoryByName(folderToRecover.name);
  if (!selectedFolder) return false;
  // Using >= to account for the fact that files may have been added
  // to the folder since it was last selected. However,
  // such files will not be included in the upload because they
  // were not in the original transfer.
  return !!(selectedFolder.totalFiles >= folderToRecover.totalFiles
    && selectedFolder.totalSize >= folderToRecover.totalSize);
}

async function startUpload() {
  if (!files.value?.length) return;

  await resumeTransfer({
    recoveredUpload: recoveredUpload.value,
    files: files.value,
  });
}
</script>
