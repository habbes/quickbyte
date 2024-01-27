<template>
  <UiBottomSheetPopoverMenu>
    <template #trigger>
      <slot name="trigger">
        <div class="cursor-pointer hover:bg-slate-800 rounded-sm py-2 px-1 flex items-center justify-center align-middle">
          <ChevronUpDownIcon class="w-5 h-5" />
        </div>
      </slot>
    </template>
    <div class="px-4 py-4 text-gray-700 font-bold flex gap-2 items-center">
      <MagnifyingGlassIcon class="w-4 h-4" />
      <input
        v-model="search"
        type="text"
        :placeholder="searchPlaceholder"
        class="flex-1 border-none outline-none"
      >
    </div>
    <slot></slot>
  </UiBottomSheetPopoverMenu>
</template>
<script lang="ts" setup>
import UiBottomSheetPopoverMenu from '@/components/ui/UiBottomSheetPopoverMenu.vue';
import { MagnifyingGlassIcon, ChevronUpDownIcon } from '@heroicons/vue/24/solid';

const search = defineModel<string>('search');

defineProps<{
  searchPlaceholder?: string;
}>();
</script>