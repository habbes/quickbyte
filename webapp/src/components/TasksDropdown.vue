<template>
    <div ref="dropdown" class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="m-1 inline-flex items-center text-[#A1A1A1] hover:text-white cursor-pointer">
        Tasks
        <RectangleStackIcon class="h-5 w-5" />
      </div>
      <ul v-if="tasks.length"
        tabindex="0"
        class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-52"
      >
        <li
          v-for="task in tasks"
          :key="task._id"
        >
          <div class="flex flex-col items-start">
            <div class="text-xs font-normal" :class="{ 'line-through': task.status === 'complete' }">
              {{ task.description }}
            </div>
            <div v-if="task.progress !== undefined && task.status === 'progress'" class="w-full flex">
              <progress class="progress progress-primary flex-1" :value="task.progress" max="100"></progress>
            </div>
          </div>
        </li>
      </ul>
      <div v-else class="p-5 text-xs shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-52">
        No active tasks running.
      </div>
    </div>
  </template>
  <script setup lang="ts">
  import { ref } from "vue";
  import { taskManager } from "@/app-utils";
  import { RectangleStackIcon } from "@heroicons/vue/24/outline";
  import Separator from "./Separator.vue";
  
  const dropdown = ref<HTMLElement>();
  const tasks = taskManager.getTasks();
  
  function closeDropdown() {
    dropdown.value?.removeAttribute('open');
  }
  </script>