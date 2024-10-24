<template>
  <div v-if="!project" class="flex flex-1 justify-center items-center h-full">
    <div  class="text-sm px-4 py-2 text-center text-gray-200">
      No project selected. Select a project on the left panel to view files and folders.
    </div>
  </div>
  <ProjectNavigator v-else :project="project" />
</template>
<script lang="ts" setup>
import { watch, ref } from "vue";
import { useRouter } from "vue-router";
import { store } from "@/app-utils";
import ProjectNavigator from "@/components/ProjectNavigator.vue";

const router = useRouter();

const project = store.currentProject;
const folderId = ref<string>();

// TODO: use a different hook, maybe onBeforeRouteEnter
watch(() => store.user, () => {
  if (!store.user.value) {
    router.push({ name: "login" });
  }
}, { immediate: true });

watch(store.selectedProjectId, async () => {
  console.log('project id changed to', store.selectedProjectId.value)
  // await fetchProjects()
  // reset selected folder
  folderId.value = undefined;
}, { immediate: true });

</script>