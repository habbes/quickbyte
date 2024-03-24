<template>
  <div class="h-full w-full flex flex-col border border-[#5e5e8b] rounded-sm">
    <div class="h-full w-full flex flex-col">
      <div class="flex-1 flex flex-col">
        <router-link
          v-if="link"
          :to="link"
          class="flex-1 bg-[#1c1b26] flex items-center justify-center"
        >
          <slot></slot>
        </router-link>
        <slot v-else></slot>
      </div>
      <div
        class="h-12 border-t border-t-[#5e5e8b] bg-[#38364e] flex justify-between flex-row items-center p-2 text-white overflow-hidden"
        :title="name">
        <div class="flex flex-col flex-1 gap-1 text-ellipsis whitespace-nowrap overflow-hidden">
          <div class="flex-1 text-ellipsis whitespace-nowrap overflow-hidden">
            <slot name="title">
              <router-link
                v-if="link"
                :to="link"
              >
                {{ name }}
              </router-link>
              <span v-else>{{ name  }}</span>
            </slot>
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
              <UiMenuItem @click="$emit('move')">
                <UiLayout horizontal itemsCenter gapSm>
                  <ArrowRightCircleIcon class="w-4 h-4" />
                  <span>Move to...</span>
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
import { EllipsisVerticalIcon, PencilIcon, TrashIcon, ArrowRightCircleIcon } from '@heroicons/vue/24/solid';
import { UiMenu, UiMenuItem, UiLayout } from '@/components/ui';
import type { RouterLinkProps } from 'vue-router';

defineProps<{
  name: string;
  link?: RouterLinkProps["to"];
}>();

defineEmits<{
  (e: 'rename'): void;
  (e: 'delete'): void;
  (e: 'move'): void;
}>();
</script>