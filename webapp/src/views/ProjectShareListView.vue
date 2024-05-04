<template>
  <UiLayout v-if="share" fill fullWidth>
      <UiLayout
        horizontal
        horizontalSpace
        itemsCenter
        justifyBetween
        class="border-b border-[#2e2634]"
        :fixedHeight="`${headerHeight}px`"
        :style="{ height: `${headerHeight}px`}"
      >
        <div class="text-white text-md flex flex-col">
          <router-link
            :to="{ name: 'project-share', params: { shareId: share._id, code: code } }"
          >
            {{ share.name }}
          </router-link>
          <div class="text-xs text-gray-300">
            Shared by {{ share.sharedBy.name }}
          </div>
        </div>
      </UiLayout>
        <UiContextMenu>
          <UiLayout ref="dropzone" innerSpace fill verticalScroll :fixedHeight="contentHeight" class="fixed" fullWidth
            :style="{ top: `${contentOffset}px`, height: contentHeight, position: 'fixed', 'overflow-y': 'auto'}"
          >
            <div
              class="grid grid-cols-2 gap-2 overflow-y-auto sm:gap-4 sm:grid-cols-3 lg:w-full lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]"
            >
              <div
                v-for="item in share.items"
                :key="item._id"
                class="w-full aspect-square"
              >
                <ProjectShareItemCard
                  :item="item"
                  :shareId="share._id"
                  :shareCode="code"
                  :allowDownload="share.allowDownload"
                  :showAllVersions="share.showAllVersions"
                  @download="downloadItem($event)"
                />
              </div>
            </div>
          </UiLayout>
        </UiContextMenu>
  </UiLayout>
  <a ref="hiddenDownloader" class="hidden" download :href="currentDownloadUrl" />
</template>
<script lang="ts" setup>
import { ref, watch, computed  } from "vue";
import { useRoute } from "vue-router";
import { trpcClient, wrapError  } from "@/app-utils";
import { ensure } from "@/core";
import type { GetProjectShareLinkItemsArgs, ProjectShareItemRef, ProjectShareLinkItemsSuccessResult } from "@quickbyte/common";
import { getRemainingContentHeightCss, layoutDimensions } from "@/styles/dimentions.js";
import { UiLayout, UiTextInput, UiButton, UiContextMenu } from "@/components/ui";
import NavBarBase from '@/components/NavBarBase.vue';
import Logo from '@/components/Logo.vue';
import { ProjectShareItemCard } from "@/components/project-share";
import { nextTick } from "process";

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
      code: code.value,
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
    }
  }, {
    finally: () => loading.value = false
  });
}

watch(() => route.params, async () => {
  await loadShare();
}, { immediate: true });
</script>