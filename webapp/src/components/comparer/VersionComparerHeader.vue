<template>
  <div class="h-[48px] border-b border-b-[#120c11] flex flex-row items-center justify-between px-5">
    <div class="flex items-center gap-5">
      <div title="Exit comparison view">
        <XMarkIcon class="h-5 w-5 hover:text-white hover:cursor-pointer" @click="$emit('close')" />
      </div>
      <div class="hidden sm:block" v-if="allowSidebarToggle">
        <button type="button" @click="showSidebar = !showSidebar"
          class="border border-black active:bg-[#1f141b] hover:bg-[#31202b] rounded-md inline-flex items-center px-2 py-1"
        >

          <div class="inline-flex items-center gap-2" v-if="showSidebar">
            <ArrowLeftCircleIcon class="h-4 w-4" />
            <span>
              Hide comments
            </span>
          </div>
          <div class="inline-flex gap-2 items-center" v-else>
            <ChatBubbleLeftRightIcon class="h-4 w-4" />
            <span>
              Show comments
            </span>
          </div>
        </button>
      </div>
    </div>
    <UiLayout horizontal itemsCenter gapSm class="overflow-hidden">
      {{ title }}
    </UiLayout>
    <div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { XMarkIcon, ArrowLeftCircleIcon, ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline';
import { UiLayout } from '@/components/ui';

defineProps<{
  title: string;
  allowSidebarToggle: boolean;
}>();

defineEmits<{
  (e: 'close'): unknown;
}>();

const showSidebar = defineModel<boolean>('showSidebar');
</script>