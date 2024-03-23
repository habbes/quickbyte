<template>
  <div class="h-full w-full flex flex-col border border-[#5e5e8b] rounded-sm">
    <div class="h-full w-full flex flex-col">
      <slot></slot>
      <div
        class="h-12 border-t border-t-[#5e5e8b] bg-[#38364e] flex justify-between flex-row items-center p-2 text-white overflow-hidden"
        :title="name">
        <div class="flex flex-col flex-1 gap-1 text-ellipsis whitespace-nowrap overflow-hidden">
          <div class="flex-1 text-ellipsis whitespace-nowrap overflow-hidden">
            <slot name="title"></slot>
          </div>
          <div class="text-xs text-gray-400 flex gap-3 items-center">
            <slot name="extraDetails"></slot>
          </div>
        </div>
        <div>
          <slot name="menu">
            <UiMenu>
              <template #trigger>
                <EllipsisVerticalIcon class="h-5 w-5" />
              </template>
              <UiMenuItem @click="$emit('rename')">
                <UiLayout horizontal itemsCenter gapSm>
                  <PencilIcon class="w-4 h-4" />
                  <span>Rename</span>
                </UiLayout>
              </UiMenuItem>
              <UiMenuItem @click="$emit('delete')">
                <UiLayout horizontal itemsCenter gapSm>
                  <TrashIcon class="w-4 h-4" />
                  <span>Delete</span>
                </UiLayout>
              </UiMenuItem>
            </UiMenu>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { EllipsisVerticalIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/solid';
import { UiMenu, UiMenuItem, UiLayout } from '@/components/ui';

defineProps<{
  name: string;
}>();

defineEmits<{
  (e: 'rename'): void;
  (e: 'delete'): void;
}>();
</script>