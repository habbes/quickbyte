<template>
  <div v-if="!project" class="flex flex-1 justify-center items-center h-full">
    <div  class="text-sm px-4 py-2 text-center text-gray-200">
      No project selected. Select a project on the left panel to view files and folders.
    </div>
  </div>
  <div v-else class="flex-1 flex flex-col h-full">
    <!-- <div class="px-2 py-2">{{ project.name }}</div> -->
    
    <div class="flex px-2 justify-between items-center border-b-[0.5px] border-b-gray-700 h-12">
      <div class="text-sm">
        {{ project.name }}
      </div>
      <div class="flex gap-2 w-[200px]">
        <!-- <button type="button"
          class="flex-1 text-sm text-gray-200 border border-black active:bg-[#1f141b] hover:bg-[#31202b] rounded-md inline-flex justify-center items-center px-2 py-1"
        >Download</button>
        <button type="button"
          class="flex-1 text-sm text-gray-200 border border-black active:bg-[#1f141b] hover:bg-[#31202b] rounded-md inline-flex justify-center items-center px-2 py-1"
        >Upload</button> -->
        <UiButton class="flex-1" sm>Upload</UiButton>
        <UiButton class="flex-1" sm>Download</UiButton>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-2 py-2"></div>
  </div>
</template>
<script lang="ts" setup>
import { watch } from "vue";
import { useRouter } from "vue-router";
import { store } from "@/app-utils";
import { UiButton } from "@/components/ui";

const router = useRouter();

const project = store.currentProject;

// TODO: use a different hook, maybe onBeforeRouteEnter
watch(() => store.user, () => {
  if (!store.user.value) {
    router.push({ name: "login" });
  }
});
</script>