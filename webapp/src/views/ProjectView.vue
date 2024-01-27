<template>
  <UiLayout v-if="project" fill fullWidth>
    <UiLayout
      horizontal
      horizontalSpace
      itemsCenter
      justifyBetween
      class="border-b border-[#2e2634]"
      :fixedHeight="`${headerHeight}px`"
      :style="{ height: `${headerHeight}px`}"
    >
    <div class="text-white text-md flex items-center">{{ project.name }}</div>
      <div class="hidden sm:block shadow-sm h-full">
        <router-link
          v-for="page in projectPages"
          :key="page.name"
          :to="{ name: page.route, params: { projectId: project._id }}"
          class="hover:text-white inline-flex h-full items-center px-4"
          exactActiveClass="text-white border-b-2 border-b-blue-300"
        >
          {{ page.name }}
        </router-link>
      </div>
      <div class="sm:hidden h-full flex text-white items-center">
        <Menu as="div" class="relative inline-block">
          <MenuButton>
            <UiLayout horizontal itemsBetween fill itemsCenter gapSm>
              <span>{{ currentSubPage?.name }}</span>
              <ChevronDownIcon class="w-3 h-3" />
            </UiLayout>
          </MenuButton>
          <MenuItems class="absolute text-black right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
            <div
              v-for="page in projectPages"
              :key="page.name"
            >
              <MenuItem
              >
                <router-link
                  :to="{ name: page.route, params: { projectId: project._id }}"
                >
                  <UiLayout innerSpace>
                    {{ page.name }}
                  </UiLayout>
                </router-link>
              </MenuItem>
            </div>
          </MenuItems>
        </Menu>
      </div>
    </UiLayout>
    <!-- <div class="flex flex-row items-center justify-between px-5 border-b border-[#2e2634]" :style="{ height: `${headerHeight}px` }">
      <div class="text-white text-lg flex items-center">{{ project.name }}</div>
      <div class="shadow-sm h-full">
        <router-link
          :to="{ name: 'project-media', params: { projectId: project._id }}"
          class="hover:text-white inline-flex h-full items-center px-4"
          exactActiveClass="text-white border-b-2 border-b-blue-300"
        >
          Media
        </router-link>
        <router-link
          :to="{ name: 'project-members', params: { projectId: project._id }}"
          class="hover:text-white inline-flex h-full items-center px-4"
          activeClass="text-white border-b-2 border-b-blue-300"
        >
          Members
        </router-link>
      </div>
    </div> -->
    <div class="flex-grow overflow-y-auto p-5" :style="{ height: contentHeight }">
      <router-view></router-view>
    </div>
  </UiLayout>
</template>
<script lang="ts" setup>
import { showToast, store, logger } from '@/app-utils';
import { ensure } from '@/core';
import type { WithRole, Project } from '@quickbyte/common';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { layoutDimensions } from '@/styles/dimentions.js';
import UiLayout from '@/components/ui/UiLayout.vue';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
import { ChevronDownIcon } from '@heroicons/vue/24/solid';

const route = useRoute();
const project = ref<WithRole<Project>>();
const loading = ref(false);
const headerHeight = 50;
const contentHeight = `calc(100vh - ${layoutDimensions.navBarHeight + headerHeight }px)`;

const projectPages = [
  {
    name: 'Media',
    route: 'project-media'
  },
  {
    name: 'Members',
    route: 'project-members'
  }
];

const currentSubPage = computed(() => {
  return projectPages.find(p => p.route === route.name);
});

onMounted(async () => {
  const account = ensure(store.currentAccount.value);
  const id = ensure(route.params.projectId) as string;
  loading.value = true;

  // we expect the project to be in the store since
  // the site fetches all user projects at load time.
  // So the project should exist in the store (if it exists for this user) even if this page
  // is visted directly by the user.
  project.value = store.projects.value.find(p => p._id === id);
  loading.value = false;
  if (!project.value) {
    showToast('The project does not exist or you do not have access.', 'error');
    return;
  }
  
  // automatically set the current account to the project's account
  // if they differ
  if (project.value.accountId !== account._id) {
    store.setCurrentAccount(project.value.accountId);
  }
});
</script>