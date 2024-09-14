<template>
  <div class="p-2 justify-center flex flex-col gap-2 h-full">
    <div
      v-for="action in actions" :key="action.title"
      @click="router.push({ name: action.target })"
      class="flex lg:w-[600px] lg:mx-auto gap-5 items-center rounded-sm shadow-md bg-[#201d2c] px-5 py-5 cursor-pointer hover:ring-1"
    >
      <div>
        <Icon :icon="action.icon" class="text-3xl"/>
      </div>
      <div class="flex flex-col gap-1">
        <div class="text-md">
          {{ action.title }}
        </div>
        <div class="text-xs text-gray-400">
          {{ action.subTitle }}
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";

const router = useRouter();

const actions = [
  {
    title: 'Open projects',
    subTitle: 'Upload or download files from a project.',
    target: 'project',
    icon: 'lucide:square-chart-gantt'
  },
  {
    title: 'Download link',
    subTitle: 'Download files from a shared link.',
    target: 'download-link',
    icon: 'lucide:link-2'
  },
  {
    title: 'Transfers',
    subTitle: 'Show your current or past transfers.',
    target: 'transfers',
    icon: 'lucide:arrow-up-down'
  }
];

</script>