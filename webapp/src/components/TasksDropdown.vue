<template>
  <div ref="dropdown" class="dropdown dropdown-end">
    <div tabindex="0" role="button" class="m-1 inline-flex items-center text-[#A1A1A1] hover:text-white cursor-pointer">
      <div class="indicator">
        <span v-if="activeTasks.length" class="indicator-item badge badge-secondary">
          {{ activeTasks.length }}
        </span>
        <InboxIcon class="h-5 w-5" />
      </div>
    </div>
    <ul v-if="tasks.length" tabindex="0"
      class="p-2 shadow menu dropdown-content flex flex-col flex-nowrap z-[1] bg-base-100 rounded-box w-60 h-60 overflow-y-auto">
      <li
        v-for="task in tasks"
        :key="task._id"
        @click="handleClickTask(task)"
        class="w-full border-b border-b-gray-100"
      >
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
            <XMarkIcon v-if="task" class="h-4 w-4 hover:bg-gray-400 hover:p-1 hover:rounded-full" @click.stop="removeTask(task)"/>
          </div>
        </div>
      </li>
    </ul>
    <div v-else class="p-5 text-xs shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-52">
      No notifications available.
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { taskManager } from "@/app-utils";
import { InboxIcon, XMarkIcon } from "@heroicons/vue/24/outline";
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
    router.push({ name: 'project-media', params: { projectId: transfer.projectId }});
    return;
  }

  router.push({ name: 'transfer', params: { transferId: transfer._id } });
}

function removeTask(task: Task) {
  taskManager.removeTask(task._id);
}
</script>