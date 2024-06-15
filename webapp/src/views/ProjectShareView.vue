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
          <form @submit.prevent="submitPassword()">
            <UiLayout gapSm>
              <UiTextInput
                v-model="rawPasswordInput"
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
import { ref, computed, watch  } from "vue";
import { useRoute, useRouter } from "vue-router";
import { projectShareStore, showToast, logger, useProjectShareItemsQuery } from "@/app-utils";
import { unwrapSingleton, unwrapSingletonOrUndefined } from "@/core";
import type { ProjectShareLinkItemsSuccessResult } from "@quickbyte/common";
import { UiLayout, UiTextInput, UiButton } from "@/components/ui";
import NavBarBase from '@/components/NavBarBase.vue';
import Logo from '@/components/Logo.vue';
import { ProjectShareDownloadAllButton } from "@/components/project-share";

const route = useRoute();
const router = useRouter();

const code = computed(() => unwrapSingleton(route.params.code));
const shareId = computed(() => unwrapSingleton(route.params.shareId));
const folderId = computed(() => unwrapSingletonOrUndefined(route.params.folderId));

const share = ref<ProjectShareLinkItemsSuccessResult>();
const rawPasswordInput = ref<string>();
const password = ref<string>();
const passwordRequired = ref(false);

const hiddenDownloader = ref<HTMLAnchorElement>();
const currentDownloadUrl = ref<string>();

const requestPassword = computed(() => (passwordRequired.value || undefined) && password.value);

const queryEnabled = computed(() => passwordRequired.value ? !!password.value : true);

const itemsQuery = useProjectShareItemsQuery({
  shareId,
  code,
  folderId,
  password: requestPassword
}, {
  enabled: queryEnabled,
  // prevent retries because so that password errors can appear immediately.
  // This feels hackish, we're using the query almost like a mutation
  errorImmediately: true
});

const loading = computed(() => itemsQuery.isPending.value);

watch(itemsQuery.data, (result) => {
  if (!result) {
    return;
  }
  if ('passwordRequired' in result) {
    passwordRequired.value = result.passwordRequired;
  } else {
    share.value = result;
    projectShareStore.setShare(share.value);
    projectShareStore.setShareCode(code.value);
    projectShareStore.setSharePassword(password.value);
  }
});

watch(itemsQuery.error, (e: any) => {
  if (!e) {
    return;
  }

  const data = e.data;
  if (
    (
      data?.appCode === 'resourceNotFound' ||
      data?.appCode === 'permissionError' ||
      data?.httpStatus === 404 ||
      data?.httpStatus === 403
    ) && route.query.closePlayer
  ) {
    // since we were redirected to this page by closing the player
    // instead of the user manually entering a url to a folder
    // that's not shared, let's gracefully fall back by redirecting
    // to the root of the share

    router.push({
      name: 'project-share',
      params: {
        shareId: share.value?._id, code: code.value
      }
    });

    return;
  }

  showToast(e.message, 'error');
  logger.error(e.message, e);
})

function submitPassword() {
  password.value = rawPasswordInput.value;
}

</script>