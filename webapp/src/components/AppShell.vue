<template>
  <div class="flex flex-col w-full min-h-screen  mx-auto max-w-7xl">
    <Navbar />
    <div class="flex flex-1 p-5">
        <slot></slot>
    </div>
    <FooterSection />
  </div>
</template>
<script lang="ts" setup>
import Navbar from '@/components/Header/Navbar.vue';
import FooterSection from '@/components/Sections/FooterSection.vue';
</script>