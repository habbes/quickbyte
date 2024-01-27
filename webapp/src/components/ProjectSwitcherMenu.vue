<template>
  <SwitcherMenu
    v-model:search="searchTerm"
    :searchPlaceholder="'Search projects'"
  >
    <UiPopoverButton
      @click="createProject()"
      class="py-4 px-4 border-t border-t-gray-300 text-[#3f4754] flex flex-row gap-1"
    >
      <PlusCircleIcon class="w-5 h-5" />
      <span>Create Project</span>
    </UiPopoverButton>
    <UiPopoverButton
      v-for="project in filteredProjects"
      :key="project._id"
      @click="switchProject(project._id)"
      class="py-4 px-4 border-t border-t-gray-300 text-gray-700 hover:bg-slate-200 cursor-pointer"
    >
      <div class="flex items-center justify-between">
        <div>
          <div>{{ project.name }}</div>
        </div>
        <div class="flex flex-col items-center gap-1">
          <div v-if="currentProjectId === project._id">
            <CheckIcon class="w-5 h-5" />
          </div>
        </div>
      </div>
    </UiPopoverButton>
  </SwitcherMenu>
  <CreateProjectDialog ref="createProjectDialog" />
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { store } from '@/app-utils';
import SwitcherMenu from '@/components/SwitcherMenu.vue';
import CreateProjectDialog from './CreateProjectDialog.vue';
import UiPopoverButton from './ui/UiPopoverButton.vue';
import { CheckIcon, PlusCircleIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  currentProjectId?: string
}>();

const router = useRouter();
const searchTerm = ref('');
const createProjectDialog = ref<typeof CreateProjectDialog>();
const projects = computed(() => store.projects.value);
const filteredProjects = computed(() => {
  if (!searchTerm.value) return projects.value;

  const regex = new RegExp(searchTerm.value, 'i');
  return projects.value.filter(p => regex.test(p.name));
});

function switchProject(id: string) {
  if (id === props.currentProjectId) return;
  router.push({ name: 'project-media', params: { projectId: id } });
}

function createProject() {
  if (!createProjectDialog.value) return;
  createProjectDialog.value.open();
}
</script>