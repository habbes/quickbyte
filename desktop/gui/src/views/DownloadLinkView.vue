<template>
  <div class="flex flex-col h-full">
    <form class="flex px-4 py-2 gap-2 items-center border-b-[0.5px] border-b-gray-700 h-12" @submit.prevent>
      <div class="flex-1">
        <UiTextInput v-model="link" fullWidth placeholder="Enter download link" required />
      </div>
      <div>
        <UiButton @click="fetchLink()" primary submit class="h-8">
          Verify link
        </UiButton>
      </div>
    </form>
    <div class="flex-1 overflow-y-auto">
      <FileTree v-if="files" :files="files" />
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
import { downloadSharedLink, downloadLegacyTransferLink } from "@/core";
import { trpcClient } from "../app-utils/index.js";
import { UiTextInput, UiButton } from "@/components/ui";
import { unwrapSingleton, DownloadTransferFileResult, ensure } from "@quickbyte/common";
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

type DownloadMetadata = ProjectShareDownloadMetadata | LegacyTransferDownloadMetadata;

type ProjectShareDownloadMetadata = {
  type: "projectShare",
  shareId: string;
  code: string;
  password?: string;
  name: string;
}

type LegacyTransferDownloadMetadata = {
  type: "legacyTransfer",
  transferId: string;
  name: string;
  downloadRequestId: string;
}

const router = useRouter();
const link = ref<string>();
const targetPath = ref<string | null | undefined>();
const files = ref<DownloadTransferFileResult[]>();
const downloadMetadata = ref<DownloadMetadata>();
const sharedLinkPassword = ref<string>();
const sharedLinkPasswordRequired = ref(false);

async function downloadFiles() {
  if (!link.value) return;
  if (!downloadMetadata.value || !files.value?.length) {
    return;
  }

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

    if (downloadMetadata.value.type === "projectShare") {
      await downloadSharedLink({
        shareId: downloadMetadata.value.shareId,
        shareCode: downloadMetadata.value.code,
        name: downloadMetadata.value.name,
        targetPath: targetPath.value,
        files: files.value
      });
    } else {
      await downloadLegacyTransferLink({
        transferId: downloadMetadata.value.transferId,
        name: downloadMetadata.value.name,
        downloadRequestId: downloadMetadata.value.downloadRequestId,
        targetPath: targetPath.value,
        files: files.value
      });
    }

    router.push({ name: 'transfers' });
  }
  catch (e: any) {
    alert(`Error ${e}`);
  }
}

async function fetchLink() {
  if (!link.value) return;
  try {
    // clear saved password
    sharedLinkPassword.value = undefined;
    const segments = link.value.split('/');
    const shareId = segments.at(-2)!;
    const code = segments.at(-1)!;

    const linkParts = getLinkParts(link.value);

    if (linkParts.type === 'projectShare') {
      const shareResult = await trpcClient.getProjectShareItems.query({
        shareId,
        code
      });

      if ("passwordRequired" in shareResult) {
        sharedLinkPasswordRequired.value = true;
        return;
      }

      if (!shareResult.allowDownload) {
        throw new Error("The specified link does not allow downloads.");
      }

      const filesResult = await trpcClient.getAllProjectShareFilesForDownload.query({
        shareId,
        shareCode: code,
      });

      // TODO: handle errors

      files.value = filesResult.files;
      downloadMetadata.value = {
        type: "projectShare",
        shareId: shareId,
        code,
        name: shareResult.name
      };
    } else if (linkParts.type === 'legacyTransfer') {
      const result = await trpcClient.requestLegacyTransferDownload.query({
        transferId: linkParts.downloadId,
        countryCode: undefined,
        ip: undefined,
        userAgent: undefined
      });

      files.value = result.files;
      downloadMetadata.value = {
        type: 'legacyTransfer',
        transferId: linkParts.downloadId,
        downloadRequestId: result.downloadRequestId,
        name: result.name,
      };
    }
  } catch (e: any) {
    alert(`Error: ${e.message}`);
  }
}

function getLinkParts(rawLink: string): DownloadLinkParts {
  const unsupportedLinkError = "You entered an unsupported link. Make sure to use a valid Quickbyte shared link."
  const url = parseUrl(rawLink);
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

function parseUrl(rawLink: string) {
  try {
    return new URL(rawLink);
  } catch (e) {
    throw new Error("The link you entered is not a valid URL. Please entered a valid Quickbyte shared link.");
  }
}
</script>