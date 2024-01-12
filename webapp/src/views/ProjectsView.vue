<template>
  <div class="flex flex-col flex-1">
    <div v-if="loading" class="w-full">
      
    </div>
    <div v-else class="w-full">
      <div v-if="projects.length === 0" class="p-5 flex min-w-full min-h-full justify-center items-center">
        <div class="flex flex-col gap-5 items-center justify-center sm:w-1/2">
          <div class="text-center">
            You have no projects in your account.
            A project allows you to organize your media files
            and collaborate with your partners and clients.
          </div>
          <div>
            <button @click="createProject()" type="button" class="btn btn-primary">Create project</button>
          </div>
        </div>
      </div>
      <div v-else class="flex flex-col flex-1">
        <RequireAccountOwner>
          <div class="flex flex-row items-center px-5" :style="{ height: `${headerHeight}px` }">
              <button
                @click="createProject()"
                class="btn btn-primary btn-sm"
              >
                <PlusIcon class="h-5 w-5" /> New Project
              </button>
          </div>
        </RequireAccountOwner>
        <div class="flex-grow overflow-y-auto p-5" :style="{ height: contentHeight }">
          <div
            class="grid"
            style="grid-gap:10px;grid-template-columns: repeat(auto-fill,minmax(200px,1fr))"
            
          >
            <div
              v-for="project in projects"
              :key="project._id"
              class="border border-gray-700 aspect-square text-white flex justify-center items-center rounded-md"
            >
              <router-link :to="{ name: 'project-media', params: { projectId: project._id }}">{{ project.name }}</router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <CreateProjectDialog ref="createProjectDialog" />
</template>
<script lang="ts" setup>
import { store } from '@/app-utils';
import { ref } from 'vue';
import CreateProjectDialog from '@/components/CreateProjectDialog.vue';
import { layoutDimensions } from '@/styles/dimentions';
import { PlusIcon } from '@heroicons/vue/24/solid';
import RequireAccountOwner from '@/components/RequireAccountOwner.vue';

const projects = store.currentProjects;
const loading = ref(false);
const createProjectDialog = ref<typeof CreateProjectDialog>();

const headerHeight = 50;
const contentHeight = `calc(100vh - ${layoutDimensions.navBarHeight + headerHeight}px)`;

function createProject() {
  createProjectDialog.value?.open();
}
</script>