<template>
  <!--
    on mobile screens (iOS Safari at least) the context menu is trigged after a single tap
    event, which is disruptive in our use cases so far.
    I'm not sure how to make it show up after a long tap instead.
    See: https://github.com/radix-vue/radix-vue/discussions/794

    In the meantime, we hide the menu on small screens. So we should
    ensure that whatever functionality is provided by the context
    menu is also accessible through some other means.

    Resorted to using JavaScript to track screen size instead
    of using css/tailwind-media queries to ensure the slots
    are rendered properly. Using css required adding extra dom
    nodes that would be hidden/shown based on screen size
    and that lead to complications that interfered and broke
    drag-and-drop feature in the project media page.
  
    TODO: Maybe we should track device OS/arch instead?
  -->
  <ContextMenuRoot v-if="!isSmallScreen">
    <ContextMenuTrigger>
      <slot></slot>
    </ContextMenuTrigger>
    <ContextMenuPortal>
      <ContextMenuContent 
        class="min-w-[220px] z-30 bg-white outline-none rounded-md p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform] data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade"
          :side-offset="5"
      >
        <slot name="menu"></slot>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
  <template v-else>
    <slot></slot>
  </template>
</template>
<script lang="ts" setup>
import {
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuPortal
} from "radix-vue";
import { onMounted, ref } from "vue";

const SMALL_SCREEN_WIDTH = 640;
const isSmallScreen = ref(false);

const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    console.log('entry', entry);
    console.log('width', entry.contentRect.width);
    isSmallScreen.value = entry.contentRect.width <= SMALL_SCREEN_WIDTH;
  }
});

onMounted(() => {
  observer.observe(document.body);
});

onMounted(() => {
  observer.disconnect();
});
</script>
