<template>
  <div class="h-screen flex items-stretch bg-[#24141f]">
    <Sidebar />
    <div class="flex-1 h-full bg-[#2a2638] text-white">
      <slot></slot>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Sidebar from "@/components/Sidebar.vue";
</script>