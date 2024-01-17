<template>
  <Popover class="relative">
    <PopoverButton>
      <div class="indicator m-1 inline-flex">
        <span v-if="activeTasks.length" class="indicator-item badge badge-secondary">
          {{ activeTasks.length }}
        </span>
        <BellIcon class="h-5 w-5" />
      </div>
    </PopoverButton>
    <PopoverOverlay class="fixed inset-0 bg-black opacity-30" />

    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <PopoverPanel class="fixed top-24 left-0 h-screen w-screen z-10 sm:absolute sm:top-auto sm:w-96 sm:translate-x-[-50%] sm:max-w-xl sm:h-96">
        <div class="h-full overflow-auto rounded-t-lg shadow-lg ring-black/5 sm:rounded-lg">
          <div class="relative h-full bg-white">
            <ul v-if="tasks.length" tabindex="0">
              <li v-for="task in tasks" :key="task._id" @click="handleClickTask(task)"
                class="w-full border-b border-b-gray-100 py-5 px-4">
                <div class="flex items-center justify-between">
                  <div class="flex flex-col items-start">
                    <div class="text-xs font-normal" :class="{ 'line-through': task.status === 'complete' }">
                      {{ task.description }}
                    </div>
                    <div v-if="task.progress !== undefined && task.status === 'progress'" class="w-full flex">
                      <progress class="progress progress-primary flex-1" :value="task.progress" max="100"></progress>
                    </div>
                  </div>
                  <div>
                    <XMarkIcon v-if="task" class="h-5 w-5 hover:bg-gray-400 hover:p-1 hover:rounded-full"
                      @click.stop="removeTask(task)" />
                  </div>
                </div>
              </li>
            </ul>
            <div v-else class="p-5 text-center">
              No notifications available.
            </div>
          </div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  PopoverOverlay
} from '@headlessui/vue';
import { taskManager } from "@/app-utils";
import { BellIcon, XMarkIcon } from "@heroicons/vue/24/solid";
import type { Task, TransferTask } from "@/core";
import { useRouter } from "vue-router";

const router = useRouter();
const dropdown = ref<HTMLElement>();
const tasks = taskManager.getTasks();
const activeTasks = computed(() =>
  tasks.value.filter(task => task.status === 'pending' || task.status === 'progress'));

function handleClickTask(task: Task) {
  if (task.type === 'transfer') {
    handleTransferClick(task);
  }
}

function handleTransferClick(task: TransferTask) {
  const transfer = task.transfer;
  if (!transfer) return;
  if (transfer.projectId) {
    router.push({ name: 'project-media', params: { projectId: transfer.projectId } });
    return;
  }

  router.push({ name: 'transfer', params: { transferId: transfer._id } });
}

function removeTask(task: Task) {
  taskManager.removeTask(task._id);
}
</script>