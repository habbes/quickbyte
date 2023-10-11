<script setup lang='ts'>
const features = [
    {
        id: 1,
        icon: 'ic:twotone-security',
        name: 'Secure file transfer',
        comingSoon: false,
        description: 'All files that you send and receive are end-to-end encrypted, meaning all your information is secure before ever leaving your device.',
    },

    {
        id: 2,
        icon: 'ri:git-repository-private-fill',
        name: 'Private file transfer',
        comingSoon: false,
        description: 'Send each and every large files with confidence, knowing that your data is protected every step of the way.',
    },

    {
        id: 3,
        icon: 'material-symbols:alarm-outline-rounded',
        name: 'Time based comments',
        comingSoon: true,
        description: 'All files that you send and receive are end-to-end encrypted, meaning all your information is secure before ever leaving your device.',
    },

    {
        id: 4,
        icon: 'heroicons:magnifying-glass',
        name: 'Track transfer downloads',
        description: 'Monitor which files have been downloaded from your shared link to enhance collaboration and data management.',
    },
    {
        id: 5,
        icon: 'ic:twotone-track-changes',
        name: 'Track different revisions of a file',
        comingSoon: false,
        description: 'Track each and every different revisions of a file that you upload to Quickbyte and send in realtime without hussle.',
    },
    {
        id: 4,
        icon: 'material-symbols:bolt',
        name: 'Lightning fast transfers',
        comingSoon: false,
        description: 'Send and share files no matter the size. Quickbyte has no file size limits and can send large files in no time.',
    },
]
</script>

<template>
    <section id="#features" class="pt-20">
        <Container>
            <div class="space-y-10">
                <div class="grid place-items-center" data-aos="fade-up">
                    <h1
                        class="max-w-lg text-2xl font-semibold leading-8 text-center text-white md:leading-tight md:text-4xl">
                        QuickByte has features both <span class="text-[#5B53FF]">familiar</span> and <span
                            class="text-[#5B53FF]">new</span>
                    </h1>
                </div>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div v-for="(item, i) in features" :key="i"
                        :class="{ 'backdrop-blur-[12px] bg-gray-900/50 cursor-not-allowed select-none': item.comingSoon }"
                        class="rounded-xl border-2 border-slate-400/10 cursor-pointer relative grid place-items-center bg-[#1111] px-6 py-6 dark:bg-neutral-900">
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
