<template>
  <dialog ref="dialog" class="modal text-black">
    <div class="modal-box bg-white">
      <div class="flex flex-row justify-between">
        <h3 class="font-bold text-lg mb-2">{{ title }}</h3>
        <XMarkIcon
          @click="close()"
          class="w-5 h-5 cursor-pointer"
        />
      </div>
      <div class="flex flex-col gap-2">
        <slot></slot>
      </div>
      <div class="modal-action" v-if="$slots.actions">
        <div method="dialog" class="flex gap-2">
          <slot name="actions"></slot>
        </div>
      </div>
    </div>
  </dialog>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/solid";

const dialog = ref<HTMLDialogElement>();

defineProps<{
  title: string
}>();

const emit = defineEmits<{
  (e: 'open'): void;
  (e: 'close'): void;
}>();

defineExpose({ open, close });

function open() {
  emit('open');
  dialog.value?.showModal();
}

function close() {
  dialog.value?.close();
  emit('close');
}

</script>