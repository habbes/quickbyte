<template>
  <div class="flex flex-col fixed w-full min-h-screen text-[#9499ae] text-sm">
    <AppNavBar />
    <div class="flex flex-1 bg-[#24141f]">
        <slot></slot>
    </div>
    <!-- <FooterSection /> -->
  </div>
</template>
<script lang="ts" setup>
import AppNavBar from '@/components/AppNavBar.vue';
</script>