<template>
    <div>
        <div class="mx-auto max-w-7xl ">
            <div
                class="relative px-6 overflow-hidden bg-black shadow-2xl isolate sm:rounded-3xl sm:px-16 md:pt-24 lg:flex lg:gap-x-20 lg:px-24 lg:pt-0">
                <svg viewBox="0 0 1024 1024"
                    class="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:left-full sm:-ml-80 lg:left-1/2 lg:ml-0 lg:-translate-x-1/2 lg:translate-y-0"
                    aria-hidden="true">
                    <circle cx="512" cy="512" r="512" fill="url(#759c1415-0410-454c-8f7c-9a820de03641)"
                        fill-opacity="0.7" />
                    <defs>
                        <radialGradient id="759c1415-0410-454c-8f7c-9a820de03641">
                            <stop stop-color="#5237F9" />
                            <stop offset="1" stop-color="#5237F9" />
                        </radialGradient>
                    </defs>
                </svg>
                <div class="grid py-32 text-center place-items-center lg:mx-0 lg:flex-auto lg:py-20 lg:text-left">
                    <h2 class="max-w-sm text-3xl font-bold tracking-tight text-center text-white sm:text-4xl">
                        Start
                        sending files <span class="line-through">tomorrow</span> <span>today</span>
                    </h2>
                    <p class="max-w-md mt-6 leading-6 text-center text-gray-300 md:text-lg text-md md:leading-7">
                        Start sending files with unprecedented speed and efficiency today!
                    </p>
                    <div class="flex items-center justify-center mt-10 gap-x-6 lg:justify-start">
                        <BaseButton label="Get started" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/Base/BaseButton.vue'
</script>
  
  