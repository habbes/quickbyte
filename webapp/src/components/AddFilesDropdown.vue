<template>
  <details v-if="supportsFolders" ref="addDropdown" class="dropdown">
    <summary role="button" class=" list-none">
      <slot>
        <div class="text-primary hover:text-primary-focus cursor-pointer flex gap-1 lowercase">
          <span>{{ buttonText || 'add more' }}</span>
          <PlusCircleIcon class="h-6 w-6"/>
        </div>
      </slot>
    </summary>
    <ul class="p-1 shadow-md border menu dropdown-content z-[1] bg-base-100 rounded-box w-auto">
      <li class="text-xs p-1">
        <a class="p-1 whitespace-nowrap" @click="onClickAddFiles()">
          <DocumentIcon class="h-4 w-4"/> Add files
        </a>
      </li>
      <li class="text-xs p-1">
        <a class="p-1 whitespace-nowrap" @click="onClickAddFolder()">
          <FolderIcon class="h-4 w-4"/> Add folder
        </a>
      </li>
    </ul>
  </details>
  <div v-else @click="onClickAddFiles()">
    <slot>
      <div class="text-primary hover:text-primary-focus cursor-pointer flex gap-1 lowercase">
        <span>{{ buttonText || 'add files' }}</span>
        <PlusCircleIcon class="h-6 w-6"/>
      </div>
    </slot>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import { isDirectoryPickerSupported } from '@/app-utils';
import { FolderIcon, DocumentIcon, PlusCircleIcon } from "@heroicons/vue/24/outline";
const addDropdown = ref<HTMLElement>();

defineProps<{
  /**
   * The text of the default drop-down button.
   * This value is ignored if you specify a custom
   * component in the default slot.
   */
  buttonText?: string;
}>();

const emit = defineEmits<{
  (e: 'addFiles'): () => unknown;
  (e: 'addFolder'): () => unknown;
}>();

const supportsFolders = isDirectoryPickerSupported();

function onClickAddFiles() {
  emit('addFiles');
  closeAddDropdown();
}

function onClickAddFolder() {
  emit('addFolder');
  closeAddDropdown();
}

function closeAddDropdown() {
  addDropdown.value?.attributes.removeNamedItem('open');
}
</script>