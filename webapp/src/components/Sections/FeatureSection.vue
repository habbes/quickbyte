<template>
    <section id="#features" class="pt-20">
        <Container>
            <div class="space-y-10">
                <div class="grid place-items-center" data-aos="fade-up">
                    <h1
                        class="max-w-lg text-2xl font-semibold leading-8 text-center text-white md:leading-tight md:text-4xl">
                        Quickbyte features
                        <!-- both <span class="text-[#5B53FF]">familiar</span> and <span
                            class="text-[#5B53FF]">new</span> -->
                    </h1>
                </div>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div v-for="(item, i) in features" :key="i"
                        :class="{ 'backdrop-blur-[12px] bg-gray-900/50 cursor-not-allowed select-none': item.comingSoon }"
                        class="rounded-xl border-2 border-slate-400/10 cursor-pointer relative grid place-items-center bg-[#1111] px-6 py-6 ">
                        <div :key="i" data-aos="fade-in" data-aos-delay="50" class="grid w-full h-full place-items-center">
                            <div class="space-y-4">
                                <div class="flex items-center space-x-4">
                                    <div class="grid w-12 h-12 border border-gray-900 rounded-full place-items-center">
                                        <div class="grid w-10 h-10 border border-gray-800 rounded-full place-items-center">
                                            <Icon :icon="item.icon" class="text-xl text-indigo-600" />
                                        </div>
                                    </div>

                                    <div v-if="item.comingSoon">
                                        <Badge label="Coming soon" />
                                    </div>
                                </div>
                                <h1 class="text-lg text-white">
                                    {{ item.name }}
                                </h1>
                                <p class="text-sm leading-6 text-neutral-300">
                                    {{ item.description }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    </section>
</template>

<script setup lang='ts'>
import { Icon } from '@iconify/vue'
import Container from '@/components/Base/Container.vue'
import Badge from '@/components/Base/Badge.vue'

const features = [
    {
        id: 1,
        icon: 'ic:twotone-security',
        name: 'Storage for your media files',
        comingSoon: false,
        description: 'Store all your project video, audio, image and other files securely in one place.',
    },
    {
        id: 2,
        icon: 'ri:git-repository-private-fill',
        name: 'Get your whole team on the same page',
        comingSoon: false,
        description: 'Add unlimited collaborators, members and clients to your projects to make sharing files and feedback seamless. Control who can upload and who can review. Collaborates get automatically notified when files are updated or when comments are added.',
    },
    {
        id: 3,
        icon: 'material-symbols:alarm-outline-rounded',
        name: 'Time based comments',
        comingSoon: false,
        description: 'Add precise comments to your media files, pinning the comments to the exact frame, eliminating confusion or misinterpretations.',
    },

    {
        id: 4,
        icon: 'heroicons:magnifying-glass',
        name: 'Track different versions of the same file',
        description: 'Track every version of your media files in one place. Easily switch back-and-forth and compare different versions and see comments made for each version.',
    },
    {
        id: 5,
        icon: 'ic:twotone-track-changes',
        name: 'Share files with people without a Quickbyte account',
        comingSoon: false,
        description: 'Share files with people without a Quickbyte account using transfer links.',
    },
    {
        id: 4,
        icon: 'material-symbols:bolt',
        name: 'Fast, recoverable file uploads',
        comingSoon: false,
        description: 'Quickbyte uploads are fast and resume automatically on network interruptions. You can even recover a failed transfer after restarting your browser or computer. Transfer up to 200GB in one go.',
    },
]
</script>

