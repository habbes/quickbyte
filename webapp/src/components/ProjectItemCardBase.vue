<template>
  <div class="h-full w-full flex flex-col border border-[#5e5e8b] rounded-sm"
    :class="{ [`border-2 border-[#7d7da1]`]: selected }"
    @dblclick="handleDoubleClick($event)"
    >
    <div class="h-full w-full flex flex-col">
      <div class="flex-1 flex flex-col cursor-pointer" @click="handleClick($event)">
        <div class="flex-1 bg-[#1c1b26] flex items-center justify-center relative">
          <div
            v-if="showSelectCheckbox"
            class="absolute left-5 top-5 z-10"
          >
            <UiCheckbox
              :checked="selected"
              class="bg-white"
              @update:checked="handleCheckboxChange()"
              @click.stop
            />
            <!-- <input :checked="selected" @change="handleCheckboxChange()" type="checkbox" @click.stop/> -->
          </div>
          <slot></slot>
        </div>
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
import { UiMenu, UiMenuItem, UiLayout, UiCheckbox } from '@/components/ui';
import { useRouter } from 'vue-router';
import type { RouterLinkProps } from 'vue-router';
import { throttle } from '@/core';

const props = defineProps<{
  name: string;
  link?: RouterLinkProps["to"];
  selected?: boolean;
  showSelectCheckbox?: boolean;
}>();

const emit = defineEmits<{
  (e: 'rename'): void;
  (e: 'delete'): void;
  (e: 'move'): void;
  (e: 'toggleSelect'): void;
  (e: 'toggleInMultiSelect'): void;
}>();

const router = useRouter();

// we throttle the click event so that if two clicks
// are triggered quickly, we handle that as a double click
// instead of handling it as two separate clicks
const handleClick = throttle((event: MouseEvent) => {
  // cmd+click on macos, ctrl+click on other OS
  // add to selection
  if (event.metaKey || event.ctrlKey) {
    emit('toggleInMultiSelect');
  }
  else {
    emit('toggleSelect');
  }
}, 250);

function handleCheckboxChange() {
  emit('toggleInMultiSelect');
}

function handleDoubleClick(event: MouseEvent) {
  if (!props.link) {
    return;
  }

  router.push(props.link);
}



</script>