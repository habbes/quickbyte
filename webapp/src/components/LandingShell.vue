<template>
  <div class="flex flex-col items-center justify-between w-full min-h-screen  mx-auto max-w-7xl">
    <Navbar />
    <div class="space-y-10 md:space-y-40">
        <slot></slot>
      <FooterSection />
    </div>
  </div>
</template>
<script lang="ts" setup>
import Navbar from '@/components/Header/Navbar.vue';
import FooterSection from '@/components/Sections/FooterSection.vue';
</script>