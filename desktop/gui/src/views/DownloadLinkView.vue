<template>
  <div class="flex flex-col h-full">
    <form class="flex px-4 py-2 gap-2 items-center border-b-[0.5px] border-b-gray-700 h-12" @submit.prevent>
      <div class="flex-1">
        <UiTextInput
          v-model="link"
          fullWidth
          placeholder="Enter download link"
          required
        />
      </div>
      <div>
        <UiButton
          @click="fetchLink()"
          primary
          submit
          sm
        >
          Verify link
        </UiButton>
      </div>
    </form>
    <div class="flex-1 overflow-y-auto">
      <FileTree 
        v-if="files"
        :files="files"
      />
    </div>
    <div
      class="flex justify-end px-4 py-2 gap-2 items-center border-t-[0.5px] border-t-gray-700 h-12"
    >
      <UiButton primary @click="downloadFiles()">Download All</UiButton>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { invoke } from "@tauri-apps/api";
import { open } from "@tauri-apps/api/dialog";
import { trpcClient } from "../app-utils/index.js";
import { UiTextInput, UiButton } from "@/components/ui";
import { unwrapSingleton, GetAllProjectShareFilesForDownloadResult } from "@quickbyte/common";
import FileTree from "@/components/FileTree.vue";

const link = ref<string>();
const targetPath = ref<string|null|undefined>();
const files = ref<GetAllProjectShareFilesForDownloadResult["files"]>();

async function fetchLink() {
  if (!link.value) return;

  const segments = link.value.split('/');
  const shareId = segments.at(-2)!;
  const code = segments.at(-1)!;

  console.log('target path', targetPath.value);
  console.log('sharedId', shareId);
  console.log('code', code);
  console.log(`shareId ${shareId}, code ${code}`);
  // const args = {
  //   shareId,
  //   code
  // };
  // const result = await trpcClient.getProjectShareItems.query(args);
  const result = await trpcClient.getAllProjectShareFilesForDownload.query({
    shareId,
    shareCode: code
  });

  files.value = result.files;

  console.log('files', files.value);
}
async function downloadFiles() {
  if (!link.value) return;
  try {
    const saveDialogResult = await open({
      title: 'Download files too...',
      directory: true,
      multiple: false
    });

    if (!saveDialogResult) {
      alert("No destination selected");
      return;
    }

    targetPath.value = unwrapSingleton(saveDialogResult);
    const segments = link.value.split('/');
    const shareId = segments.at(-2)!;
    const code = segments.at(-1)!;

    console.log('target path', targetPath.value);
    console.log('sharedId', shareId);
    console.log('code', code);
    console.log(`shareId ${shareId}, code ${code}`);
    // const args = {
    //   shareId,
    //   code
    // };
    // const result = await trpcClient.getProjectShareItems.query(args);
    const result = await trpcClient.getAllProjectShareFilesForDownload.query({
      shareId,
      shareCode: code
    });

    files.value = result.files;

    console.log(`Result\n${JSON.stringify(result, null, 2)}`);

    await invoke('download_shared_link', {
      linkRequest: {
        shareId: shareId,
        shareCode: code,
        name: "Files to Download",
        targetPath: targetPath.value,
        files: result.files
      }
    });

    alert("Download complete");
  }
  catch (e: any) {
    alert("Error ${e}`");
  }
}
</script>