<template>
  <!-- <UiDialog ref="dialog" title="Choose a plan" widthStyle="w-[1000px]"> -->
  <Dialog :open="isOpen" @close="setIsOpen" class="relative z-50">
    <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
    <div class="fixed inset-0 flex w-screen items-center justify-center p-4">
      
      <DialogPanel class=" max-h-[90%] w-fit flex flex-col align-middle overflow-y-auto gap-2 py-4 px-4 items-center rounded bg-white">
        <DialogTitle>Choose a plan</DialogTitle>
        <SubscriptionPlans />
      </DialogPanel>
    </div>
        
  </Dialog>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { UiDialog } from "@/components/ui";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@headlessui/vue'
import SubscriptionPlans from "./SubscriptionPlans.vue";

const dialog = ref<typeof UiDialog>();
const isOpen = ref(false);

defineExpose({ open });

function open() {
  isOpen.value = true;
}

function setIsOpen(value: boolean) {
  isOpen.value = value;
}

</script>