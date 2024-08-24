<template>
  <div class="w-[250px] text-white flex flex-col">
    <div v-if="user"
      class="flex items-center border-b-[0.5px] border-b-gray-700 h-12 px-2 text-sm"
    >
      {{ user.name }}
    </div>
    <router-link v-else
      :to="{ name: 'login' }"
      class="flex items-center border-b-[0.5px] border-b-gray-700 hover:bg-[#2a1824] h-12 px-2 text-sm"
      activeClass="bg-[#2a1924]"
    >
      Login to view project
    </router-link>
    <div class="flex-1 overflow-y-auto text-sm py-4 px-2">
      <div v-for="account in groupedProjects" :key="account._id">
        <div
          class="px-2 cursor-pointer"
          @click="toggleAccountExpanded(account._id)"
        >
          {{ account.name }}
        </div>
        <div class="p-2" v-if="isAccountExpanded(account._id)">
          <div
            v-for="project in account.projects"
            :key="project._id"
            @click="handleProjectClick(project._id)"
            class="p-4 py-2 cursor-pointer"
            :class="{
              'bg-gray-800 rounded-sm text-white': project._id === selectedProjectId
            }"
          >
            {{ project.name }}
          </div>
        </div>
      </div>
    </div>
    <router-link
      class="flex items-center border-t-[0.5px] border-t-gray-700 hover:bg-[#2a1824] h-12 px-2 text-sm"
      activeClass="bg-[#2a1924]"
      :to="{ name: 'download-link' }"
    >
      Download link
    </router-link>
    <router-link
      class="flex items-center border-t-[0.5px] border-t-gray-700 hover:bg-[#2a1824] h-12 px-2 text-sm"
      activeClass="bg-[#2a1924]"
      :to="{ name: 'transfers' }"
    >
      Transfers
    </router-link>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { store, setCurrentProject } from "@/app-utils";
import type { WithRole, Project } from '@quickbyte/common';

type AccountWithProjects = {
  _id: string;
  name: string;
  projects: WithRole<Project>[];
};

const router = useRouter();
const user = store.user;
const selectedProjectId = store.selectedProjectId;
const collapsedAccounts = ref<Set<string>>(new Set());

const groupedProjects = computed<AccountWithProjects[]>(() => {
  const result: AccountWithProjects[] = [];
  for (const account of store.accounts.value) {
    const projects = store.projects.value.filter(p => p.accountId === account._id);
    result.push({
      _id: account._id,
      name: account.name,
      projects
    });
  }

  return result;
});

function handleProjectClick(id: string) {
  setCurrentProject(id);
  router.push({ name: 'project' });
}

function isAccountExpanded(id: string) {
  return !collapsedAccounts.value.has(id);
}

function toggleAccountExpanded(id: string) {
  if (collapsedAccounts.value.has(id)) {
    collapsedAccounts.value.delete(id);
  } else {
    collapsedAccounts.value.add(id);
  }
}

</script>