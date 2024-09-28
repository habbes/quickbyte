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
          class="h-8"
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
    <PageFooter v-if="files && files.length">
      <div class="flex flex-1 justify-end">
        <UiButton primary @click="downloadFiles()">Download All</UiButton>
      </div>
    </PageFooter>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { open } from "@tauri-apps/api/dialog";
import { downloadSharedLink } from "@/core";
import { trpcClient } from "../app-utils/index.js";
import { UiTextInput, UiButton } from "@/components/ui";
import { unwrapSingleton, GetAllProjectShareFilesForDownloadResult, ensure } from "@quickbyte/common";
import FileTree from "@/components/FileTree.vue";
import PageFooter from "@/components/PageFooter.vue"

type DownloadLinkParts = ProjectShareLinkParts | LegacyTransferLinkParts;

type ProjectShareLinkParts = {
  type: "projectShare";
  shareId: string;
  code: string;
}

type LegacyTransferLinkParts = {
  type: "legacyTransfer",
  downloadId: string;
}

const router = useRouter();
const link = ref<string>();
const targetPath = ref<string|null|undefined>();
const files = ref<GetAllProjectShareFilesForDownloadResult["files"]>();

async function fetchLink() {
  if (!link.value) return;

  const segments = link.value.split('/');
  const shareId = segments.at(-2)!;
  const code = segments.at(-1)!;

  // TODO: handle different link types

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

    await downloadSharedLink({
        shareId: shareId,
        shareCode: code,
        name: "Files to Download",
        targetPath: targetPath.value,
        // @ts-ignore
        files: result.files
    });

    router.push({ name: 'transfers' });
  }
  catch (e: any) {
    alert(`Error ${e}`);
  }
}

function getLinkParts(rawLink: string): DownloadLinkParts {
  const unsupportedLinkError = "You entered an nsupported link. Make sure to use a valid Quickbyte shared link."
  const url = new URL(rawLink);
  // TODO: confirm the domain matches the configured base webapp URL
  const path = url.pathname;
  if (path.startsWith("/share")) {
    const parts = path.split("/");
    // path has format /share/<shareId>/<code>
    ensure(parts.length > 3, unsupportedLinkError);
    const shareId = parts[2];
    const code = parts[3];
    return {
      type: 'projectShare',
      shareId,
      code
    };
  } else if (path.startsWith("/d")) {
    const parts = path.split("/");
    // path format /d/<transferId>
    ensure(parts.length > 2, unsupportedLinkError);
    const downloadId = parts[2];
    return {
      type: 'legacyTransfer',
      downloadId
    };
  } else {
    throw new Error(unsupportedLinkError)
  }
}
</script>