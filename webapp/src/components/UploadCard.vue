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
import { useClipboard, watchOnce } from '@vueuse/core';
import { ref, computed, watch } from "vue";
import { PencilIcon, CheckIcon } from "@heroicons/vue/24/outline";
import { apiClient, store, uploadRecoveryManager, logger, useFilePicker, showToast, windowUnloadManager } from '@/app-utils';
import { humanizeSize, ensure, ApiError, AzUploader, MultiFileUploader } from "@/core";
import Button from "@/components/Button.vue";
import UploadListFileItem from './UploadListFileItem.vue';
import UploadListFolderItem from './UploadListFolderItem.vue';
import AddFilesDropDown from './AddFilesDropdown.vue';

type UploadState = 'initial' | 'fileSelection' | 'progress' | 'complete';

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

const uploadProgress = ref<number>(0);
const uploadState = ref<UploadState>('initial');
const downloadUrl = ref<string|undefined>();
const copiedDownloadUrl = ref<boolean>(false);
const fileListContainer = ref<HTMLDivElement>();

watch([files], () => {
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

  const removeExitWarning = windowUnloadManager.warnUserOnExit();
  try {
    uploadProgress.value = 0;
    downloadUrl.value = undefined;
    uploadState.value = 'progress';
    const started = new Date();
    const blockSize = 16 * 1024 * 1024; // 16MB

    const user = ensure(store.userAccount.value);
    const provider = ensure(store.preferredProvider.value);

    const transfer = await apiClient.createTransfer(user.account._id, {
      name: transferDetails.value.name,
      provider: provider.provider,
      region: provider.bestRegions[0],
      files: Array.from(files.value.values()).map(f => ({ name: f.path, size: f.file.size })),
      meta: {
        ip: store.deviceData.value?.ip,
        countryCode: store.deviceData.value?.countryCode,
        userAgent: store.deviceData.value?.userAgent
      }
    });

    const transferTracker = uploadRecoveryManager.createTransferTracker({
      name: transfer.name,
      id: transfer._id,
      totalSize: transferDetails.value.totalSize,
      blockSize,
      files: transfer.files.map(f => ({ size: f.size, path: f.name })),
      directories: directories.value.map(d => ({ totalFiles: d.totalFiles, totalSize: d.totalSize, name: d.name }))
    });

    const uploader = new MultiFileUploader({
      files: transfer.files,
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
          tracker: transferTracker.createFileTracker({
            blockSize,
            id: fileToTrack._id,
            filename: fileToTrack.name,
            size: fileToTrack.size
          }),
          onProgress: onFileProgress,
          logger,
          concurrencyStrategy: transfer.files.length === 1 ? 'maxParallelism' : 'fixedWorkers'
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
    // reset transfer name so that a new transfer starts on a blank state
    transferName.value = undefined;
  } finally {
    removeExitWarning();
  }
}
</script>