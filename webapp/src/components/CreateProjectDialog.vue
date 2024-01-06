<template>
  <dialog ref="dialog" id="createProjectDialog" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-2">Create new project</h3>
      <div class="flex flex-col gap-2">
        <div class="flex flex-col">
          <input v-model="name"
            class="input input-bordered input-sm w-full"
            placeholder="Enter project name"
            :class="{ 'input-error': nameError }"
          />
          <span class="text-error text-xs">{{ nameError }}</span>
        </div>
        <div>
          <textarea v-model="description" class="textarea textarea-bordered textarea-sm w-full resize-none" placeholder="Enter project description" />
        </div>
      </div>
      <div class="modal-action">
        <form method="dialog" class="flex gap-2">
          <!-- if there is a button in form, it will close the modal -->
          <button @click="createProject($event)" class="btn btn-primary">Create project</button>
          <button class="btn">Cancel</button>
        </form>
      </div>
    </div>
  </dialog>
</template>
<script lang="ts" setup>
import { apiClient, logger, showToast, store } from "@/app-utils";
import { ensure, type Project } from "@/core";
import { ref } from "vue";
import { useRouter } from "vue-router";

const dialog = ref<HTMLDialogElement>();
const name = ref('');
const nameError = ref('');
const description = ref('');
const loading = ref(false);
const router = useRouter();

defineExpose({ open });

const emit = defineEmits<{
  (e: 'createProject', project: Project): void;
}>();

function reset() {
  name.value = '';
  nameError.value = '';
  description.value = '';
}

function open() {
  reset();
  dialog.value?.showModal();
}

function close() {
  dialog.value?.close();
}

async function createProject(event: Event) {
  event.preventDefault(); // prevent closing the model
  const user = ensure(store.userAccount.value);
  if (!name.value) {
    nameError.value = 'Project name is required';
    return;
  }

  try {
    loading.value = true;
    const project = await apiClient.createProject(user.account._id, {
      name: name.value,
      description: description.value
    });

    emit('createProject', project);
    router.push({ name: 'project-media', params: { projectId: project._id }});
    showToast(`The project '${project.name}' has been created`, 'info');
    close();
  } catch (e: any) {
    logger.error(e);
    showToast(e.message, 'error');
  } finally {
    loading.value = false;
  }
}
</script>