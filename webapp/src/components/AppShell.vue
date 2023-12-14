<template>
  <div class="flex flex-col fixed w-full min-h-screen text-[#9499ae] text-sm">
    <Navbar />
    <div class="flex flex-1 bg-[#24141f]">
        <slot></slot>
    </div>
    <!-- <FooterSection /> -->
  </div>
</template>
<script lang="ts" setup>
import Navbar from '@/components/Header/Navbar.vue';
import FooterSection from '@/components/Sections/FooterSection.vue';
</script>