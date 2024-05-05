<template>
    <header class="sticky inset-0 top-0 z-50 w-full flex flex-col justify-center" :style="{ height: `${layoutDimensions.navBarHeight}px` }">
      <nav class="px-6">
        <div class="relative flex flex-wrap items-center justify-between gap-6 md:gap-0">
          <!-- <input v-model="hamburgerMenuOpen" id="toggle_nav" aria-hidden="true" type="checkbox" name="toggle_nav" class="hidden peer"> -->
          <div class="relative top-0 z-50 flex justify-between w-full md:px-0">
            <div class="flex items-center gap-1 sm:gap-2 align-middle">
              <slot name="logo"></slot>
            </div>
  
            <div class="flex items-center gap-2">
              <slot name="right"></slot>
            </div>
          </div>
        </div>
      </nav>
    </header>
  </template>
    
  <script setup lang='ts'>
  import { layoutDimensions } from '@/styles/dimentions.js';
  
  </script>
    
  <style scoped>
  #toggle_nav:checked~div #hamburger #line {
    @apply rotate-45 translate-y-1.5
  }
  
  #toggle_nav:checked~div #hamburger #line2 {
    @apply -rotate-45 -translate-y-1
  }
  </style>