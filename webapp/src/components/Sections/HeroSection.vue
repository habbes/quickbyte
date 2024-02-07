<template>
    <Container>
        <div class="grid w-full mt-16 space-y-4 lg:mt-14 lg:gap-x-4 lg:grid-cols-2 md:gap-0 xl:gap-x-20 md:items-center">
            <div>
                <div class="space-y-1">
                    <h1
                        class="block text-3xl font-bold text-center text-white sm:text-4xl lg:text-start lg:text-6xl lg:leading-tight ">
                        Streamlined collaboration for video teams and creatives.
                    </h1>
                </div>
                <p class="mt-3 text-sm text-center leading-6 lg:text-start md:text-lg md:leading-8 text-[#7B7F98] ">
                    Still sifting through emails to find out what changes your client requested on that project?
                    Switch to Quickbyte today to reclaim your sanity.
                </p>
                <div class="grid w-full gap-3 mt-6 place-items-center lg:inline-flex">
                    <router-link
                        :to="{ name: 'login' }"
                        class="px-4 py-3 text-white bg-[#5B53FF] hover:bg-[#5237F9] transition duration-200 ease-in rounded-md flex items-center space-x-2">
                        <span>Get started</span>
                        <Icon icon="ic:baseline-arrow-forward-ios" class="text-white" />
                    </router-link>
                </div>
            </div>

            <div class="relative">
                <div>
                    <ModalVideo />
                </div>
            </div>
        </div>
    </Container>
</template>
<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Container from '@/components/Base/Container.vue'
import ModalVideo from '@/components/Modal/ModalVideo.vue'
</script>
  