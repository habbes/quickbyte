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
      <div v-else class="flex flex-col flex-1 mt-2">
        <UiLayout horizontal itemsCenter horizontalSpace gapSm>
          <UiLayout fill>
            <UiSearchInput v-model="searchTerm" placeholder="Search projects" />
          </UiLayout>
          <RequireAccountOwner>
            <div class="flex flex-row items-center" :style="{ height: `${headerHeight}px` }">
                <UiButton
                  @click="createProject()"
                  class="btn btn-primary"
                >
                  <PlusIcon class="h-5 w-5" /><span class="hidden sm:inline">New Project</span>
                </UiButton>
            </div>
          </RequireAccountOwner>
        </UiLayout>
        <UiLayout fill innerSpace verticalScroll :fixedHeight="contentHeight">
          <div
            class="grid"
            style="grid-gap:10px;grid-template-columns: repeat(auto-fill,minmax(200px,1fr))"
            
          >
            <router-link
              v-for="project in filteredProjects"
              :key="project._id"
              :to="{ name: 'project-media', params: { projectId: project._id }}"
            >
              <div
                class="border border-[#5e5e8b] h-28 sm:h-auto sm:aspect-square text-white flex justify-center items-center rounded-md bg-[#1c1b26]
                hover:border-2"
              >
                {{ project.name }}
              </div>
            </router-link>
          </div>
        </UiLayout>
      </div>
    </div>
  </div>
  <CreateProjectDialog ref="createProjectDialog" />
</template>
<script lang="ts" setup>
import { store } from '@/app-utils';
import { computed, ref } from 'vue';
import CreateProjectDialog from '@/components/CreateProjectDialog.vue';
import { layoutDimensions } from '@/styles/dimentions';
import { PlusIcon } from '@heroicons/vue/24/solid';
import RequireAccountOwner from '@/components/RequireAccountOwner.vue';
import UiLayout from '@/components/ui/UiLayout.vue';
import UiSearchInput from '@/components/ui/UiSearchInput.vue';
import UiButton from '@/components/ui/UiButton.vue';

const projects = store.currentProjects;
const loading = ref(false);
const createProjectDialog = ref<typeof CreateProjectDialog>();
const searchTerm = ref<string>();

const filteredProjects = computed(() => {
  if (!searchTerm.value) return projects.value;

  const regex = new RegExp(searchTerm.value, 'i');
  return projects.value.filter(p => regex.test(p.name) || regex.test(p.description));
})

const headerHeight = 50;
const contentHeight = `calc(100dvh - ${layoutDimensions.navBarHeight + headerHeight}px)`;

function createProject() {
  createProjectDialog.value?.open();
}
</script>