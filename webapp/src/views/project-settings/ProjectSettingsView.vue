<template>
  <UiLayout fill gapSm v-if="project">
    <UiLayout
      class="h-[54px] border-b border-[#2e2634]"
      horizontal
      itemsCenter
      innerSpace
    >
      <h2 class="text-xl">Project settings</h2>
    </UiLayout>
    <UiLayout innerSpace gapSm>
      <SectionCard title="Project name">
        <UiLayout>
          Set the project's name.
        </UiLayout>
        <UiLayout>
          <UiTextInput dark v-model="name" fullWidth placeholder="Enter project name"/>
        </UiLayout>
        <UiLayout horizontal justifyEnd>
          <UiButton
            :disabled="name === project.name"
            @click="updateProjectName()"
          >
            Save
          </UiButton>
        </UiLayout>
      </SectionCard>
      <SectionCard title="Project URL">
        <UiLayout>
          This is a direct link to your project. You can share this link with
          your collaborators after you have granted them access to your project.
        </UiLayout>
        <UiLayout>
          <UiTextInput disabled :modelValue="url" fullWidth />
        </UiLayout>
        <UiLayout horizontal justifyEnd>
          <UiButton @click="copyUrl()">Copy</UiButton>
        </UiLayout>
      </SectionCard>
    </UiLayout>
  </UiLayout>
</template>
<script lang="ts" setup>
import { useRoute } from "vue-router";
import { useClipboard } from "@vueuse/core";
import { UiLayout, UiTextInput, UiButton } from "@/components/ui";
import { computed, ref, watch } from "vue";
import { logger, showToast, store, trpcClient } from "@/app-utils";
import SectionCard from "./SectionCard.vue";

const route = useRoute();
const { copy } = useClipboard();
const project = computed(() => store.projects.value.find(p => p._id === route.params.projectId as string));
const url = computed(() => `${location.origin}/projects/${project.value?._id}`)
const name = ref(project.value?.name);


watch([route], () => {
  name.value = project.value?.name;
}, { immediate: true });

function copyUrl() {
  copy(url.value);
  showToast("Project URL copied to clipboard.", "info");
}

async function updateProjectName() {
  if (!name.value) return;
  if (!project.value) return;
  if (name.value === project.value?.name) return;

  try {
    const udpatedProject = await trpcClient.updateProject.mutate({
      id: project.value?._id,
      name: name.value
    });

    const projectWithRole = { ...udpatedProject, role: project.value.role };
    store.addProject(projectWithRole);
    showToast(`Project name changed to ${projectWithRole.name}`, 'info');
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}

</script>