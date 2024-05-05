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
      <RequireRole :current="project.role" :accepted="['admin', 'owner']">
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
      </RequireRole>
      <SectionCard title="Project URL">
        <UiLayout>
          This is a direct link to your project. You can share this link with
          your collaborators after you have granted them access to your project.
        </UiLayout>
        <UiLayout>
          <UiTextInput dark disabled :modelValue="url" fullWidth />
        </UiLayout>
        <UiLayout horizontal justifyEnd>
          <UiButton @click="copyUrl()">Copy</UiButton>
        </UiLayout>
      </SectionCard>
      <SectionCard title="Delete project">
        <UiLayout>
          <UiLayout horizontal itemsCenter gapSm>
            <ExclamationTriangleIcon class="h-7 w-7 text-error" /> <span class="font-bold">This operation is irreversible.</span>
          </UiLayout>
        </UiLayout>
        <UiLayout horizontal>
          <UiButton danger @click="openDeleteDialog()">Delete project</UiButton>
        </UiLayout>
      </SectionCard>
    </UiLayout>
  </UiLayout>
  <ConfirmActionDialog
    v-if="project"
    ref="deleteDialog"
    :title="`Delete project ${project.name}`"
    actionLabel="Delete project"
    actionDanger
    :input="project"
    :action="deleteProject"
  >
    <div>
      Are you sure you want to delete project <span class="font-bold">{{ project.name }}</span>?
      This action is <span class="font-bold">irreversible</span>.
    </div>
  </ConfirmActionDialog>
</template>
<script lang="ts" setup>
import { useRoute, useRouter } from "vue-router";
import { useClipboard } from "@vueuse/core";
import { UiLayout, UiTextInput, UiButton } from "@/components/ui";
import ConfirmActionDialog from "@/components/ConfirmActionDialog.vue";
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import { computed, ref, watch } from "vue";
import { logger, showToast, store, trpcClient } from "@/app-utils";
import SectionCard from "./SectionCard.vue";
import RequireRole from "@/components/RequireRole.vue";
import type { Project } from "@quickbyte/common";

const route = useRoute();
const router = useRouter();
const { copy } = useClipboard();
const project = computed(() => store.projects.value.find(p => p._id === route.params.projectId as string));
const url = computed(() => `${location.origin}/projects/${project.value?._id}`)
const name = ref(project.value?.name);
const deleteDialog = ref<typeof ConfirmActionDialog>();


watch([route], () => {
  name.value = project.value?.name;
}, { immediate: true });

function copyUrl() {
  copy(url.value);
  showToast("Project URL copied to clipboard.", "info");
}

function openDeleteDialog() {
  // @ts-ignore not sure why TS doesn't see the open() fn
  deleteDialog.value?.open();
}

async function deleteProject(project: Project) {
  await trpcClient.deleteProject.mutate({ id: project._id });
  store.deleteProject(project._id);
  showToast(`Project '${project.name}' has been successfully delete.`, 'info');
  router.push({ name: 'projects' });
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