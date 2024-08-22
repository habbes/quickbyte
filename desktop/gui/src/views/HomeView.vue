<template>
  <div class="p-2 flex flex-col gap-2 h-full">
    <div
      v-for="action in actions" :key="action.title"
      class="flex flex-col gap-1 rounded-sm shadow-md bg-[#201d2c] px-5 py-5 cursor-pointer hover:ring-1"
    >
      <div class="text-md">
        {{ action.title }}
      </div>
      <div class="text-xs text-gray-400">
        {{ action.subTitle }}
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>

const actions = [
  {
    title: 'Open projects',
    subTitle: 'Upload or download files from a project.'
  },
  {
    title: 'Download link',
    subTitle: 'Download files from a shared link.'
  }
];

</script>