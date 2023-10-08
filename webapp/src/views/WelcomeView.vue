<template>
  <div class="flex flex-col md:flex-row items-center md:justify-between min-h-screen px-10 md:px-14 gap-5">
    <div class=sm:flex-1>
      <div class="text-white mb-4">
        <h1
          class="text-white font-light text-4xl text-[50px] mb-10 opacity-80"
          style="font-family: 'Secular One'; line-height: 60px;"
        >
          Quickbyte is the best way to transfer large files.
        </h1>
        <p class="mb-10 opacity-70 text-xl">
          Starting from just $6 a month.
        </p>
      </div>
      <LoginButton />
    </div>
    <div class="sm:flex-1 bg-gray-900 p-1 md:p-1 rounded relative bg-opacity-50" >
    <!-- <div class="flex-1 mockup-window border bg-base-300"> -->
      <iframe class="w-full sm:w-full sm:h-[315px]" src="https://www.youtube.com/embed/aGQZpvjTF1M?si=9BKY3untP9fi2TQd" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div>
  </div>
</template>
<script lang="ts" setup>
import LoginButton from '@/components/LoginButton.vue';
</script>