<template>
  <div class="card w-96 bg-base-100 shadow-xl">
    <!-- initial state -->
    <div class="card-body" v-if="uploadState === 'initial' && !files.length">
      <div>Select the following files and folders to resume transfer:</div>
      <div v-for="dir in recoveredUpload.directories" :key="dir.name">
        {{ dir.name }} ({{ dir.totalFiles }} files)
      </div>
      <div v-for="file in rootFiles" :key="file.path">
        {{ file.path }} ({{ humanizeSize(file.file.size) }})
      </div>
      <div class="card-actions">
        <Button @click="openFilePicker()" class="">Select files to upload</Button>
        <Button v-if="directoryPickerSupported" @click="openDirectoryPicker()" class="">Select directory to upload</Button>
        <button @click="resetStateAndComplete()" class="btn">Cancel</button>
      </div>
    </div>

    <div class="card-body" v-if="uploadState === 'initial' && files.length && !filesMatch">
      <div class="alert alert-error">
        The selected files do not match the recovered files.
        Please select the correct files to resume transfer.
      </div>
      <!-- <div class="text-sm text-gray-400">
        Recovered file: <b>{{ recoveredUpload.filename }}</b> {{ humanizeSize(recoveredUpload.size) }}
      </div>
      <div class="text-sm text-gray-400">
        Selected file: <b>{{ file.name }}</b> {{ humanizeSize(file.size) }}
      </div> -->
      <div class="card-actions">
        <Button @click="openFilePicker()" class="">Select files to upload</Button>
        <Button v-if="directoryPickerSupported" @click="openDirectoryPicker()" class="">Select directory to upload</Button>
        <button @click="resetStateAndComplete()" class="btn">Cancel</button>
      </div>
    </div>

    <!-- file selected -->
    <div class="card-body" v-if="uploadState === 'initial' && files.length && filesMatch">
      <h2 class="card-title">{{ recoveredUpload.name  }}</h2>
      <div>
        <div>
          <div v-for="dir in directories" :key="dir.name">
            {{ dir.name }}
          </div>
          <div v-for="file in rootFiles" :key="file.path">
            {{ file.path }}
          </div>
        </div>
      </div>
      <p class="text-gray-400">
        {{ files?.length }} files - {{  humanizeSize(recoveredUpload.totalSize) }} <br>
      </p>
      <div class="card-actions justify-center mt-4">
        <button class="btn btn-primary flex-1" @click="startUpload()">Upload</button>
        <button class="btn" @click="resetStateAndComplete()">Cancel</button>
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
</template>
<script lang="ts" setup>
import { useClipboard } from '@vueuse/core';
import { ref, computed } from "vue";
import { apiClient, store, uploadRecoveryManager, logger, useFilePicker, showToast, type FilePickerEntry } from '@/app-utils';
import { humanizeSize, ensure, ApiError, AzUploader, MultiFileUploader, type TrackedTransfer } from "@/core";
import Button from "@/components/Button.vue";

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
  onError: onFilePickerError,
  directoryPickerSupported,
  files,
  directories,
  reset
} = useFilePicker();

onFilePickerError((e) => {
  showToast(e.message, 'error');
});

const { copy } = useClipboard();

const rootFiles = computed(() => files.value.filter(f => !f.path.includes('/')));

const recoveredUpload = computed(() => ensure(store.recoveredTransfers.value.find(u => props.uploadId === u.id)));

const filesMatch = computed(() =>
  files.value && checkRecoveredAndUploadedFilesMatch(recoveredUpload.value, files.value)
);

const uploadProgress = ref<number>(0);
const uploadState = ref<UploadState>('initial');
const downloadUrl = ref<string | undefined>();
const copiedDownloadUrl = ref<boolean>(false);

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
  return recovered.files
    .every(file =>
      files.some(otherFile =>
        otherFile.path === file.path && otherFile.file.size === file.size));
}

async function startUpload() {
  if (!files.value?.length) return;

  uploadProgress.value = 0;
  downloadUrl.value = undefined;
  uploadState.value = 'progress';
  const started = new Date();
  const blockSize = recoveredUpload.value.blockSize;

  const user = ensure(store.userAccount.value);
  ensure(store.preferredProvider.value);

  const transfer = await apiClient.getTransfer(user.account._id, recoveredUpload.value.id);

  const transferTracker = uploadRecoveryManager.recoverTransferTracker(recoveredUpload.value);

  // todo: keep track of completed files either on the API or transfer tracker
  // init transferRecovery to fetch completed files
  const recoveryResult = await transferTracker.initRecovery();
  
  const uploader = new MultiFileUploader({
    files: transfer.files,
    completedFiles: recoveryResult.completedFiles,
    onProgress: (progress) => {
      uploadProgress.value = progress
    },
    uploaderFactory: (file, onFileProgress, fileIndex) => {
      if (!files.value) throw new Error("Excepted files.value to be set");
      
      const fileToTrack = ensure(
        transfer.files.find(f => f.name === files.value[fileIndex].path),
        `Cannot find file '${files.value[fileIndex].path}' in transfer package.`);

      return new AzUploader({
        file: files.value[fileIndex].file,
        blockSize,
        uploadUrl: file.uploadUrl,
        completedBlocks: recoveryResult.inProgressFiles.get(fileToTrack.name)?.completedBlocks,
        tracker: transferTracker.recoverFileTracker({
          blockSize,
          id: fileToTrack._id,
          filename: fileToTrack.name,
          size: fileToTrack.size
        }),
        onProgress: onFileProgress,
        logger
      })
    }
  });

  await uploader.uploadFiles();

  const stopped = new Date();
  logger.log(`full upload operation took ${stopped.getTime() - started.getTime()}`);

  let retry = true;
  while (retry) {
    try {
      const download = await apiClient.finalizeTransfer(user.account._id, transfer._id);
      retry = false;
      downloadUrl.value = `${location.origin}/d/${download._id}`;
      uploadState.value = 'complete';
      logger.log(`full operation + download link took ${(new Date()).getTime() - started.getTime()}`);
    } catch (e) {
      if (e instanceof ApiError) {
        // Do not retry on ApiError since it's not a network failure.
        // TODO: handle this error some other way, e.g. alert message
        retry = false;
      } else {
        logger.error('Error fetching download', e);
        retry = true;
      }
    }
  }

  await transferTracker.completeTransfer(); // we shouldn't block for this, maybe use promise.then?
  // TODO: We should monitor wether deleting the transfer from here will cause some error
  // (since this component requires that transfer in the store)
  // should we await the promise?
  // Also, should the delete handler be triggered automatically by completeTransfer?
  uploadRecoveryManager.deleteRecoveredTransfer(recoveredUpload.value.id);
}
</script>
