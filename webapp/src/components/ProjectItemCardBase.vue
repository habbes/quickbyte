<template>
  <UiContextMenu>
    <div class="h-full w-full flex flex-col border border-[#5e5e8b] rounded-sm"
      :class="{ [`border-2 border-[#7d7da1]`]: selected }"
      @dblclick="handleDoubleClick($event)"
    >
      <div class="h-full w-full flex flex-col">
        <div class="flex-1 flex flex-col cursor-pointer"
          @mousedown.left="handleMouseDown($event)"
          @mouseup.left="handleMouseUp($event)"
          @touchstart.prevent.stop="handleMouseDown($event)"
          @touchend.prevent.stop="handleMouseUp($event)"
        >
          <div class="flex-1 bg-[#1c1b26] flex items-center justify-center relative">
            <div
              v-if="showSelectCheckbox"
              class="absolute left-5 top-5 z-10"
            >
              <UiCheckbox
                :checked="selected"
                class="bg-white"
                @update:checked="handleCheckboxChange()"
                @mousedown.left.stop
                @mouseup.left.stop
                @click.stop
              />
            </div>
            <slot></slot>
          </div>
        </div>
        <slot name="footer">
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
                  <slot name="menuItems">
                    <ProjectItemMenuItems
                      :totalSelectedItems="totalSelectedItems"
                      @rename="$emit('rename')"
                      @move="$emit('move')"
                      @share="$emit('share')"
                      @delete="$emit('delete')"
                      @selectAll="$emit('selectAll')"
                      @unselectAll="$emit('unselectAll')"
                    />
                  </slot>
                </UiMenu>
              </slot>
            </div>
          </div>
        </slot>
      </div>
    </div>
    <template #menu>
      <slot name="menuItems">
        <ProjectItemMenuItems
          :totalSelectedItems="totalSelectedItems"
          @rename="$emit('rename')"
          @move="$emit('move')"
          @share="$emit('share')"
          @delete="$emit('delete')"
          @selectAll="$emit('selectAll')"
          @unselectAll="$emit('unselectAll')"
        />
      </slot>
    </template>
  </UiContextMenu>
</template>
<script lang="ts" setup>
import { EllipsisVerticalIcon } from '@heroicons/vue/24/solid';
import { UiMenu, UiCheckbox, UiContextMenu } from '@/components/ui';
import ProjectItemMenuItems from "./ProjectItemMenuItems.vue";
import { useRouter } from 'vue-router';
import type { RouterLinkProps } from 'vue-router';
import { splitShortAndLongEventHandler } from '@/core';

const props = defineProps<{
  name: string;
  link?: RouterLinkProps["to"];
  selected?: boolean;
  showSelectCheckbox?: boolean;
  totalSelectedItems?: number;
}>();

const emit = defineEmits<{
  (e: 'rename'): void;
  (e: 'delete'): void;
  (e: 'move'): void;
  (e: 'share'): void;
  (e: 'toggleSelect'): void;
  (e: 'toggleInMultiSelect'): void;
  (e: 'selectAll'): void;
  (e: 'unselectAll'): void;
  (e: 'click'): void;
}>();

const router = useRouter();

const {
  handleEventStart: handleMouseDown,
  handleEventEnd: handleMouseUp
} = splitShortAndLongEventHandler<MouseEvent|TouchEvent>(
  handleClick,
  handleLongClick
);

function handleCheckboxChange() {
  emit('toggleInMultiSelect');
}

function handleClick(event: MouseEvent|TouchEvent) {
  // a (short) click event opens the item
  // but if there's meta/ctrl key
  // or if there are other items currently
  // select, we trick click as select
  if (event.metaKey || event.ctrlKey) {
    emit('toggleInMultiSelect');
    return;
  }

  if (props.totalSelectedItems && props.totalSelectedItems > 0) {
    emit('toggleInMultiSelect');
    return;
  }

  if (!props.link) {
    // if link is not provided, trigger click event instead
    emit('click');
    return;
  }

  router.push(props.link);
}

function handleDoubleClick(event: MouseEvent) {
  // double click always opens the item
  if (!props.link) {
    return;
  }

  router.push(props.link);
}

function handleLongClick(event: MouseEvent|TouchEvent) {
  // long click triggers selection
  if (event.metaKey || event.ctrlKey) {
    emit('toggleInMultiSelect');
    return;
  }

  emit('toggleSelect');
}

</script>