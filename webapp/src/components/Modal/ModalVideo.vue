<template>
    <div>
        <button
            class="relative flex items-center justify-center focus:outline-none focus-visible:ring focus-visible:ring-indigo-300 rounded-3xl group"
            @click="modalOpen = true" aria-label="Watch the video">
            <img class="transition-shadow duration-300 ease-in-out shadow-2xl rounded-3xl"
                src="https://img.youtube.com/vi/pbxZ6RPGBps/hqdefault.jpg"
                width="768" height="432" alt="Modal video thumbnail" />
            <svg class="absolute transition-transform duration-300 ease-in-out pointer-events-none group-hover:scale-110"
                xmlns="<http://www.w3.org/2000/svg>" width="72" height="72">
                <circle class="fill-white" cx="36" cy="36" r="36" fill-opacity=".8" />
                <path class="fill-indigo-500 drop-shadow-2xl"
                    d="M44 36a.999.999 0 0 0-.427-.82l-10-7A1 1 0 0 0 32 29V43a.999.999 0 0 0 1.573.82l10-7A.995.995 0 0 0 44 36V36c0 .001 0 .001 0 0Z" />
            </svg>
        </button>

        <TransitionRoot :show="modalOpen" as="template">
            <Dialog :initialFocus="videoRef" @close="modalOpen = false">
                <TransitionChild className="fixed inset-0 z-[99999] bg-opacity-50 transition-opacity"
                    enter="transition ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="transition ease-out duration-100" leaveFrom="opacity-100" leaveTo="opacity-0"
                    aria-hidden="true" />
                <TransitionChild className="fixed inset-0 z-[99999] flex p-6" enter="transition ease-out duration-300"
                    enterFrom="opacity-0 scale-75" enterTo="opacity-100 scale-100" leave="transition ease-out duration-200"
                    leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-75">
                    <div class="relative flex items-center h-full mx-auto md:max-w-5xl">
                        <DialogPanel
                            class="h-[400px] relative grid place-items-center overflow-hidden shadow-2xl md:w-[600px] lg:w-[800px] rounded-3xl">
                            <button @click="modalOpen = false" type="button"
                                class="absolute top-0 bg-black rounded-md right-2">
                                <Icon icon="heroicons:x-mark-20-solid" class="text-2xl text-white" />
                            </button>

                            <iframe class="w-full h-full"
                                src="https://www.youtube.com/embed/pbxZ6RPGBps?si=Y_Cd1bXwvV5QNxsz"
                                title="YouTube video player" frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowfullscreen></iframe>
                        </DialogPanel>
                    </div>
                </TransitionChild>
            </Dialog>
        </TransitionRoot>
    </div>
</template>
<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, watch } from 'vue'
import {
    Dialog,
    DialogPanel,
    TransitionRoot,
    TransitionChild,
} from '@headlessui/vue'

const modalOpen = ref<boolean>(false)
const videoRef = ref<HTMLVideoElement | null>(null)

watch(videoRef, () => {
    videoRef.value?.play()
})
</script>