<template>
  <div v-if="!project" class="flex flex-1 justify-center items-center h-full">
    <div  class="text-sm px-4 py-2 text-center text-gray-200">
      No project selected. Select a project on the left panel to view files and folders.
    </div>
  </div>
  <div v-else>
    Selected project: {{ project.name }}
  </div>
</template>
<script lang="ts">
import { watch } from "vue";
import { useRouter } from "vue-router";
import { store } from "@/app-utils";

const router = useRouter();

const project = store.currentProject;

// TODO: use a different hook, maybe onBeforeRouteEnter
watch(() => store.user, () => {
  if (!store.user.value) {
    router.push({ name: "login" });
  }
});
</script>