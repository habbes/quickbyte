<template>
  <div>Upload</div>
  <div>
    <label>Token:</label>
    <input type="text" v-model="token">
  </div>
  <div>
    <label>Project:</label>
    <input type="text" v-model="projectId">
  </div>
  <div>
    <label>Folder:</label>
    <input type="text" v-model="folderId">
  </div>
  <div>
    <button type="button" @click="selectFiles()">Get user data</button>
  </div>
  <div>
    <pre>
      {{ log }}
    </pre>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { trpcClient } from "../app-utils";
import { open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api';
import { appDataDir } from '@tauri-apps/api/path';

const projectId = ref("uEjObhFeSvDaL3DvYcw70Q");
const folderId = ref("x7hd082vJjRvNjBcBn7PsA");
const token = ref(import.meta.env.VITE_TEST_TOKEN);
const log = ref("");
// async function getUserData() {
//   const user = await trpcClient.getCurrentUserData.query();
//   console.log(user);
// }

async function selectFiles() {
  // Open a selection dialog for directories
  const selected = await open({
    multiple: true,
    recursive: true,
    defaultPath: await appDataDir(),
  });

  log.value += `\n${JSON.stringify(selected, null, 2)}`;

  const files = await invoke<{ path: string, name: string, size: number }[]>('get_file_sizes', { files: selected });

  log.value += `\nFiles:${JSON.stringify(files, null, 2)}`;

  const result = await trpcClient.uploadProjectMedia.mutate({
    projectId: projectId.value,
    folderId: folderId.value,
    provider: 'az',
    region: 'northsa',
    files: files.map(f => ({
      name: f.name,
      size: f.size
    }))
  });

  log.value += `\nTransfer: ${JSON.stringify(result.transfer, null, 2)}`;

  const request = {
    transferId: result.transfer._id,
    files: result.transfer.files.map(f => {
      const matchedFile = files.find(meta => meta.name === f.name)!;
      return {
        path: matchedFile.path,
        name: matchedFile.name,
        transferFile: f
      }
    })
  };

  log.value += `\nUploading files: ${JSON.stringify(request, null, 2)}`;
  await invoke('upload_files', { request });
  log.value += `\nCompleted upload.`;
}
</script>
