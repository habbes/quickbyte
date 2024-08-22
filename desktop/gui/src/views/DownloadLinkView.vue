<template>
  <form class="px-4 py-2 flex flex-col gap-2" @submit.prevent>
    <div>
      <UiTextInput
        v-model="link"
        label="Enter the download link shared with you"
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
      >
        Start download
      </UiButton>
    </div>
  </form>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { invoke } from "@tauri-apps/api";
import { open } from "@tauri-apps/api/dialog";
import { trpcClient } from "../app-utils/index.js";
import { UiTextInput, UiButton } from "@/components/ui";
import { unwrapSingleton } from "@quickbyte/common";

const link = ref<string>();
const targetPath = ref<string|null|undefined>();

async function fetchLink() {
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