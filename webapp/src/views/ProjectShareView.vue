<template>
  <div class="flex flex-col fixed w-full min-h-screen text-[#9499ae] text-sm">
    <NavBarBase>
      <template #logo>
        <Logo />
      </template>
      <template #right>
        Download all
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
            This link is password-protected. You need to enter
            the correct password to access. Ask the sender
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
                >
                  Proceed
                </UiButton>
              </UiLayout>
          </UiLayout>
          </form>
        </UiLayout>
      </UiLayout>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted  } from "vue";
import { useRoute, useRouter } from "vue-router";
import { trpcClient, wrapError  } from "@/app-utils";
import NavBarBase from '@/components/NavBarBase.vue';
import Logo from '@/components/Logo.vue';
import { UiLayout, UiTextInput, UiButton } from "@/components/ui";
import { ensure } from "@/core";
import type { GetProjectShareLinkItemsArgs, ProjectShareLinkItemsSuccessResult } from "@quickbyte/common";

const route = useRoute();
const share = ref<ProjectShareLinkItemsSuccessResult>();
const password = ref<string>();
const passwordRequired = ref(false);

function loadShare() {
  const shareId = ensure(route.params.shareId as string);
  const code = ensure(route.params.code as string);

  return wrapError(async () => {
    const args: GetProjectShareLinkItemsArgs = {
      shareId: shareId,
      code: code
    };

    if (passwordRequired.value && password.value) {
      args.password = password.value
    }
  
    const result = await trpcClient.getProjectShareItems.query(args);

    if ('passwordRequired' in result) {
      passwordRequired.value = result.passwordRequired;
    } else {
      share.value = result;
    }
  });
}

onMounted(async () => {
  await loadShare();
});
</script>