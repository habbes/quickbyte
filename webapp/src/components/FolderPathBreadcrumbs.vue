<template>
  <div>
    <!-- desktop view -->
    <div class="hidden lg:block">
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
              :to="getFolderLink(folder._id)"
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
    <div class="lg:hidden">
      <UiLayout horizontal itemsCenter gapSm>
        <UiLayout
          v-if="path.length > 1"
          horizontal
          itemsCenter
          gapSm
        >
          <span title="Show parent folders">
            <UiMenu>
              <template #trigger>
                ..
              </template>
              <UiMenuItem
                v-for="folder in ancestors"
                :key="folder._id"
              >
                <UiLayout horizontal gapSm itemsCenter>
                  <router-link
                    :to="getFolderLink(folder._id)"
                    class="flex gap-2 items-center"
                  >
                    <FolderIcon class="h-5 w-5" /> {{ folder.name }}
                  </router-link>
                </UiLayout>
              </UiMenuItem>
            </UiMenu>
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
              :to="getFolderLink(path[path.length - 1]._id)"
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
import { UiLayout, UiMenu, UiMenuItem } from "@/components/ui";
import { FolderIcon } from "@heroicons/vue/24/solid";
import { computed } from "vue";

const props = defineProps<{
  path: FolderPathEntry[];
  getFolderLink: (folderId: string) => { name: string; params: Record<string, any> } | string;
}>();

const ancestors = computed(() => {
  if (props.path.length < 2) {
    return [];
  }

  return props.path.slice(0, props.path.length - 1).reverse();
})
</script>