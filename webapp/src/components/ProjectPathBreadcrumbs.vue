<template>
  <div>
    <!-- desktop view -->
    <div class="hidden sm:block">
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
              :to="{ name: 'project-media', params: { projectId: projectId, folderId: folder._id }}"
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
    </div>
    <!-- mobile view, show only one path at most and an ellipsis to move back to the parent -->
    <div class="sm:hidden">
      <UiLayout horizontal itemsCenter gapSm>
        <UiLayout
          v-if="path.length > 1"
          horizontal
          itemsCenter
          gapSm
        >
          <span :title="path[path.length - 2].name">
            <router-link
              :to="{ name: 'project-media', params: { projectId: projectId, folderId: path[path.length - 2]._id }}"
              class="text-gray-300 hover:text-gray-100 inline-flex items-center align-middle"
              activeClass="text-white"
            >
              ..
            </router-link>
          </span>
          <span
            class="text-gray-500"
          >
            /
          </span>
        </UiLayout>
        <UiLayout
          v-if="path.length > 0"
          horizontal
          itemsCenter
          gapSm
        >
          <span :title="path[path.length - 1].name" class="max-w-[90px] sm:max-w-[150px] truncate">
            <router-link
              :to="{ name: 'project-media', params: { projectId: projectId, folderId: path[path.length - 1]._id }}"
              class="text-gray-300 hover:text-gray-100"
              activeClass="text-white"
            >
              {{ path[path.length - 1].name }}
            </router-link>
          </span>
        </UiLayout>
      </UiLayout>
    </div>
  </div>
</template>
<script lang="ts" setup>
import type { FolderPathEntry } from "@quickbyte/common";
import { UiLayout } from "@/components/ui";

defineProps<{
  projectId: string;
  path: FolderPathEntry[];
}>();
</script>