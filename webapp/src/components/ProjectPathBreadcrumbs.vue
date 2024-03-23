<template>
  <UiLayout horizontal itemsCenter gapSm>
    <UiLayout
      horizontal
      itemsCenter
      gapSm
      v-for="(folder, index) in path"
      :key="folder._id"
    >
      <span :title="folder.name" class="max-w-[150px] truncate">
        <router-link
          :to="{ name: 'project-folder', params: { projectId: projectId, folderId: folder._id }}"
          class="text-gray-300 hover:text-gray-100"
          activeClass="text-white"
        >
          {{ folder.name }}
        </router-link>
      </span>
      <span
        v-if="index < path.length - 1"
        class="text-gray-500"
      >
        /
      </span>
    </UiLayout>
  </UiLayout>
</template>
<script lang="ts" setup>
import type { FolderPathEntry } from "@quickbyte/common";
import { UiLayout } from "@/components/ui";

defineProps<{
  projectId: string;
  path: FolderPathEntry[];
}>();
</script>