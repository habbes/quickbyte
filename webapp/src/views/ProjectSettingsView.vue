<template>
  <UiLayout fill gapSm v-if="project">
    <UiLayout
      class="h-[54px] border-b border-[#2e2634]"
      horizontal
      itemsCenter
      innerSpace
    >
      <h2 class="text-xl">Project settings</h2>
    </UiLayout>
    <UiLayout innerSpace gapSm>
      <UiLayout class="border border-[#2e2634] rounded-md p-8 w-2/3 mx-auto">
        <UiLayout gapSm>
          <UiLayout>
            <h3 class="text-lg">Project name</h3>
          </UiLayout>
          <UiLayout>
            <UiTextInput dark v-model="name" fullWidth placeholder="Enter project name"/>
          </UiLayout>
          <UiLayout horizontal justifyEnd>
            <UiButton>Save</UiButton>
          </UiLayout>
        </UiLayout>
      </UiLayout>
      <UiLayout class="border border-[#2e2634] rounded-md p-8 w-2/3 mx-auto">
        <UiLayout gapSm>
          <UiLayout>
            <h3 class="text-lg">Project URL</h3>
          </UiLayout>
          <UiLayout>
            This is a direct link to your project. You can share this link with
            your collaborators after you have granted them access to your project.
          </UiLayout>
          <UiLayout>
            <UiTextInput disabled :modelValue="url" fullWidth />
          </UiLayout>
          <UiLayout horizontal justifyEnd>
            <UiButton @click="copyUrl()">Copy</UiButton>
          </UiLayout>
        </UiLayout>
      </UiLayout>
    </UiLayout>
  </UiLayout>
</template>
<script lang="ts" setup>
import { useRoute } from "vue-router";
import { useClipboard } from "@vueuse/core";
import { UiLayout, UiTextInput, UiButton } from "@/components/ui";
import { computed, ref, watch } from "vue";
import { showToast, store } from "@/app-utils";

const route = useRoute();
const { copy } = useClipboard();
const project = computed(() => store.projects.value.find(p => p._id === route.params.projectId as string));
const url = computed(() => `${location.origin}/projects/${project.value?._id}`)
const name = ref(project.value?.name);


watch([route], () => {
  name.value = project.value?.name;
}, { immediate: true });

function copyUrl() {
  copy(url.value);
  showToast("Project URL copied to clipboard.", "info");
}

</script>