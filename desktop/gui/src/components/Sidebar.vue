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
    <div class="flex-1 overflow-y-auto">
      <div v-for="account in groupedProjects" :key="account._id">
        <div>
          {{ account.name }}
        </div>
        <div>
          <div v-for="project in account.projects" :key="project._id">
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
    <div class="flex items-center border-t-[0.5px] border-t-gray-700 h-12 px-2 text-sm">
      Transfers
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from "vue";
import { store } from "@/app-utils";
import type { WithRole, Project } from '@quickbyte/common';

type AccountWithProjects = {
  _id: string;
  name: string;
  projects: WithRole<Project>[];
};

const user = store.user;

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

</script>