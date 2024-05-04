<template>
  <div class="flex flex-col fixed w-full min-h-screen text-[#9499ae] text-sm">
    <NavBarBase>
      <template #logo>
        <Logo />
      </template>
      <template #right>
        <ProjectShareDownloadAllButton v-if="share && share.allowDownload" />
      </template>
    </NavBarBase>
    <div class="flex flex-1 bg-[#24141f]">
      <UiLayout
        v-if="!share && passwordRequired"
        itemsCenter
        justifyCenter
        class="w-full sm:w-[500px] sm:m-auto"
        gapSm
      >
        <UiLayout gapSm itemsCenter>
          <p class="text-lg text-white">
            The link is password protected.
          </p>
          <p>
            You need to enter a password to access the shared items. Ask the sender
            to share the password with you.
          </p>
        </UiLayout>
        <UiLayout fullWidth>
          <form @submit.prevent="loadShare()">
            <UiLayout gapSm>
              <UiTextInput
                v-model="password"
                required
                fullWidth
                :type="'password'"
                label="Enter password"
                placeholder="Enter password"
              />
              <UiLayout>
                <UiButton
                  submit
                  primary
                  :disabled="loading"
                  :loading="loading"
                >
                  Proceed
                </UiButton>
              </UiLayout>
          </UiLayout>
          </form>
        </UiLayout>
      </UiLayout>
      <router-view v-if="share"></router-view>
    </div>
    <a ref="hiddenDownloader" class="hidden" download :href="currentDownloadUrl" />
  </div>
</template>
<script lang="ts" setup>
import { ref, computed, watch, nextTick  } from "vue";
import { useRoute } from "vue-router";
import { trpcClient, wrapError, projectShareStore } from "@/app-utils";
import { ensure } from "@/core";
import type { GetProjectShareLinkItemsArgs, ProjectShareItemRef, ProjectShareLinkItemsSuccessResult } from "@quickbyte/common";
import { getRemainingContentHeightCss, layoutDimensions } from "@/styles/dimentions.js";
import { UiLayout, UiTextInput, UiButton } from "@/components/ui";
import NavBarBase from '@/components/NavBarBase.vue';
import Logo from '@/components/Logo.vue';
import { ProjectShareDownloadAllButton } from "@/components/project-share";

const route = useRoute();
const code = computed(() => ensure(route.params.code as string));
const loading = ref(false);
const share = ref<ProjectShareLinkItemsSuccessResult>();
const password = ref<string>();
const passwordRequired = ref(false);
const headerHeight = layoutDimensions.projectHeaderHeight;
const contentOffset = headerHeight + layoutDimensions.navBarHeight + layoutDimensions.projectHeaderHeight + 2;
const contentHeight = getRemainingContentHeightCss(
  contentOffset
);

const hiddenDownloader = ref<HTMLAnchorElement>();
const currentDownloadUrl = ref<string>();

function downloadItem(item: ProjectShareItemRef) {
  if (item.type === 'folder') {
    // TODO: support folder download
    return;
  }

  if (!share.value) {
    return;
  }

  const media = share.value.items.find(i => i._id === item._id && i.type === 'media');
  if (!media || media.type !== 'media') {
    return;
  }

  if (!media.item.file.downloadUrl) {
    return;
  }

  currentDownloadUrl.value = media.item.file.downloadUrl;
  nextTick(() => hiddenDownloader.value?.click());
}

function loadShare() {
  const shareId = ensure(route.params.shareId as string);
  const folderId = route.params.folderId as string|undefined;

  loading.value = true;

  return wrapError(async () => {
    const args: GetProjectShareLinkItemsArgs = {
      shareId: shareId,
      code: code.value
    };

    if (folderId) {
      args.folderId = folderId;
    }

    if (passwordRequired.value && password.value) {
      args.password = password.value
    }

    const result = await trpcClient.getProjectShareItems.query(args);

    if ('passwordRequired' in result) {
      passwordRequired.value = result.passwordRequired;
    } else {
      share.value = result;
      projectShareStore.setShare(share.value);
      projectShareStore.setShareCode(code.value);
      projectShareStore.setSharePassword(password.value);
    }
  }, {
    finally: () => loading.value = false
  });
}

watch([() => route.params.shareId, () => route.params.code, () => route.params.folderId], async () => {
  await loadShare();
}, { immediate: true });
</script>