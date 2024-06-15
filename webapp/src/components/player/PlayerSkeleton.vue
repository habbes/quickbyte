<template>
  <div class="flex flex-col fixed top-0 bottom-0 left-0 right-0 z-50 bg-[#261922]">
    <div class="h-[48px] border-b border-b-[#120c11] flex flex-row items-center justify-between px-5" :style="headerClasses">
      <div>
        <XMarkIcon class="h-5 w-5 hover:text-white hover:cursor-pointer" @click="closePlayer()" />
      </div>
      <UiLayout horizontal itemsCenter gapSm class="overflow-hidden">
        <div class="max-w-[200px] sm:max-w-max overflow-hidden text-ellipsis">
          <span class="text-white text-md overflow-hidden whitespace-nowrap"></span>
        </div>
      </UiLayout>
      <div>
       
      </div>
    </div>
    <div class="flex flex-col-reverse sm:flex-row h-[calc(100dvh-48px)] relative">
     
      <!-- start sidebar -->
      <div class="w-full sm:w-96 border-r border-r-[#120c11] text-[#d1bfcd] text-xs flex flex-col">
         <!-- start sidebar header -->
        <div class="flex items-stretch h-[30px] border-b border-b-black">
          <div
            v-if="allowComments"
            class="flex-1 flex items-center gap-2 px-4"
          >
            <ChatBubbleLeftRightIcon class="h-4 w-4" />
            Comments
          </div>
          <div
            class="flex-1 flex items-center gap-2 px-4"
          >
            <ListBulletIcon class="h-4 w-4" />
            Browse files
          </div>
        </div>
        <!-- end sidebar header -->

        <!-- start comment section -->
        <div v-if="allowComments">
          <div class="commentsList overflow-y-auto flex flex-col sm:h-[calc(100dvh-278px)]">
            <!-- placeholder for the comment list -->
          </div>

          <div class="px-5 py-5 border-t border-t-[#120c11] flex flex-col gap-2 h-[150px] sm:h-[200px]">
            <div class="flex-1 bg-[#604a59] rounded-md p-2 flex flex-col gap-2">
              <!-- placeholder for the input box -->
            </div>
            <div>
              <!-- placeholder for send button -->
              <UiSkeleton class="rounded-md h-[24px] w-[50px]" />
            </div>
          </div>
        </div>
        <!-- end comment section -->
        <!-- file list section -->
        <div
          v-if="!allowComments"
          class="filesList overflow-y-auto sm:h-[calc(100dvh-78px)]"
        >
          <!-- placeholder for the file list-->
        </div>
        <!-- end file list section -->
        
      </div>
      <!-- end sidebar -->
      <!-- player container -->
      <div class="sm:h-full flex-1 sm:px-5 sm:items-center flex items-stretch justify-center">
          <div class="h-full max-h-full w-full flex items-center justify-center">
            <!-- placeholder for the player container -->
            <UiSpinner v-if="showSpinner" />
          </div>
      </div>
      <!-- end player container -->
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onUnmounted } from "vue"
import { XMarkIcon, ChatBubbleLeftRightIcon, ListBulletIcon } from '@heroicons/vue/24/outline';
import { UiLayout, UiSkeleton, UiSpinner } from '@/components/ui';

defineProps<{
  allowComments: boolean
}>()


const emit = defineEmits<{
  (e: 'close'): unknown;
}>();

function closePlayer() {
  emit('close');
}

// had difficulties getting the scrollbar on the comments panel to work
// properly using overflow: auto css, so I resorted to hardcoding dimensions
const headerSize = 48;
const headerClasses = {
  height: `${headerSize}px`
};

const showSpinner = ref(false);

// If the actual media player loads quickly enough,
// we don't want to show the spinner immediately, it might
// give impression that the site is slow or heavy.
// But if the skeleton is rendered for longer period (see timeout threshold below)
// then show the spinner so the user can tell that there's
// some activity/loading taking place
const timer = setTimeout(() => {
  showSpinner.value = true;
  // Picked the threshold after experimenting with a few values
  // Open to adjusting this threshold based on experience
}, 700);

onUnmounted(() => {
  clearTimeout(timer);
});
</script>