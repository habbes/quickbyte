<!-- <template>
  <div class="flex flex-col items-center min-h-screen gap-5 px-10 md:flex-row md:justify-between md:px-14">
    <div class=sm:flex-1>
      <div class="mb-4 text-white">
        <h1
          class="text-white font-light text-4xl text-[50px] mb-10 opacity-80"
          style="font-family: 'Secular One'; line-height: 60px;"
        >
          Quickbyte is the best way to transfer large files.
        </h1>
        <p class="mb-10 text-xl opacity-70">
          Starting from just $6 a month.
        </p>
      </div>
      <LoginButton />
    </div>
    <div class="relative p-1 bg-gray-900 bg-opacity-50 rounded sm:flex-1 md:p-1" >
    <div class="flex-1 border mockup-window bg-base-300">
      <iframe class="w-full sm:w-full sm:h-[315px]" src="https://www.youtube.com/embed/aGQZpvjTF1M?si=9BKY3untP9fi2TQd" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div>
  </div>
</template> -->
<!-- <script lang="ts" setup>
import LoginButton from '@/components/LoginButton.vue';
</script> -->
<template>
  <LandingShell>
    <div class="space-y-20">
      <HeroSection />
      <FeatureSection />
      <PriceSection />
      <FAQSection />
      <CTASection/>
    </div>
  </LandingShell>
</template>

<script setup lang="ts">
import HeroSection from '@/components/Sections/HeroSection.vue'
import FeatureSection from '@/components/Sections/FeatureSection.vue'
import PriceSection from '@/components/Sections/PriceSection.vue'
import FAQSection from '@/components/Sections/FAQSection.vue';
import CTASection from '@/components/Sections/CTASection.vue';
import LandingShell from '@/components/LandingShell.vue';
</script>