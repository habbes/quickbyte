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
    <div class="text-white text-md flex items-center gap-2">
      <router-link
        :to="{ name: 'project-media', params: { projectId: project._id } }"
      >
        {{ project.name }}
      </router-link>
      <ProjectSwitcherMenu :currentProjectId="project._id" />
      <div>
        <ProjectPathBreadcrumbs :projectId="project._id" :path="folderPath" />
      </div>
    </div>
      <!-- tabs on large screens -->
      <div class="hidden sm:block shadow-sm h-full">
        <RequireRole
          v-for="page in projectPages"
          :key="page.name"
          :accepted="page.allowedRoles"
          :current="project.role"
        >
          <router-link
            
            :to="{ name: page.route, params: { projectId: project._id, ...page.params }}"
            class="hover:text-white inline-flex h-full items-center px-4"
            exactActiveClass="text-white border-b-2 border-b-blue-300"
          >
            {{ page.name }}
          </router-link>
        </RequireRole>
      </div>
      <!-- dropdown menu on mobile screens -->
      <div class="sm:hidden h-full flex text-white items-center">
        <Menu as="div" class="relative inline-block">
          <MenuButton>
            <UiLayout horizontal itemsBetween fill itemsCenter gapSm>
              <span>{{ currentSubPage?.name }}</span>
              <ChevronDownIcon class="w-3 h-3" />
            </UiLayout>
          </MenuButton>
          <MenuItems class="absolute text-black right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-20">
            <div
              v-for="page in projectPages"
              :key="page.name"
            >
              <RequireRole
                :accepted="page.allowedRoles"
                :current="project.role"
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
              </RequireRole>
            </div>
          </MenuItems>
        </Menu>
      </div>
    </UiLayout>
    <div class="flex-grow overflow-y-auto" :style="{ height: contentHeight }">
      <router-view></router-view>
    </div>
  </UiLayout>
</template>
<script lang="ts" setup>
import { showToast, store } from '@/app-utils';
import { ensure } from '@/core';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getRemainingContentHeightCss, layoutDimensions } from '@/styles/dimentions.js';
import UiLayout from '@/components/ui/UiLayout.vue';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
import { ChevronDownIcon } from '@heroicons/vue/24/solid';
import ProjectSwitcherMenu from '@/components/ProjectSwitcherMenu.vue';
import ProjectPathBreadcrumbs from '@/components/ProjectPathBreadcrumbs.vue';
import type { FolderPathEntry, RoleType } from '@quickbyte/common';
import { providerFolderPathSetter } from "./project-utils.js";
import RequireRole from '@/components/RequireRole.vue';

type NavPage = {
  name: string;
  route: string;
  params: Record<string, string>;
  allowedRoles: RoleType[];
};

const route = useRoute();
const loading = ref(false);
const headerHeight = layoutDimensions.projectHeaderHeight;
const contentHeight = getRemainingContentHeightCss(layoutDimensions.navBarHeight + headerHeight);
const folderPath = ref<FolderPathEntry[]>([]);
providerFolderPathSetter((path) => {
  folderPath.value = path
});


const project = computed(() => {
  const id = ensure(route.params.projectId) as string;
  loading.value = true;

  // we expect the project to be in the store since
  // the site fetches all user projects at load time.
  // So the project should exist in the store (if it exists for this user) even if this page
  // is visted directly by the user.
  const value = store.projects.value.find(p => p._id === id);
  if (!value) {
    showToast('The project does not exist or you do not have access.', 'error');
    return;
  }
  return value;
});

watch([project], () => {
  if (!project.value) return;
  const account = ensure(store.currentAccount.value);
  // automatically set the current account to the project's account
  // if they differ
  if (project.value.accountId !== account._id) {
    store.setCurrentAccount(project.value.accountId);
  }
});

const projectPages = computed<NavPage[]>(() => {
  const folderId = (folderPath.value.length &&
    folderPath.value[folderPath.value.length - 1]._id) ||
    route.params.folderId as (string|undefined) ||
    undefined;

  const pages: NavPage[] = [
    {
      name: 'Media',
      route: 'project-media',
      params: folderId ? { folderId } : {},
      allowedRoles: ['admin', 'owner', 'editor', 'reviewer']
    },
    {
      name: 'Members',
      route: 'project-members',
      params: {},
      allowedRoles: ['admin', 'owner', 'editor']
    },
    {
      name: 'Shared Links',
      route: 'project-shared-links',
      params: {},
      allowedRoles: ['admin', 'owner']
    },
    {
      name: 'Settings',
      route: "project-settings",
      params: {},
      allowedRoles: ['admin', 'owner', 'editor']
    }
  ];

  return pages;
});

const currentSubPage = computed(() => {
  return projectPages.value.find(p => p.route === route.name);
});
</script>