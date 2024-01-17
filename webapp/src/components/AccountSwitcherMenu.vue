<template>
  <Popover class="relative">
    <PopoverButton>
      <slot></slot>
    </PopoverButton>
    <PopoverOverlay class="fixed inset-0 bg-black opacity-30" />

    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <PopoverPanel
        class="fixed top-24 sm:top-auto left-0 h-screen sm:h-auto sm:absolute z-10 mt-3 w-screen sm:w-72  sm:translate-x-[-30%] transform sm:px-4 lg:max-w-3xl"
      >
        <div class="h-full overflow-hidden rounded-t-lg sm:rounded-lg shadow-lg ring-1 ring-black/5">
          <div class="relative bg-white h-full">
            <div class="px-4 py-4 text-gray-700 font-bold flex gap-2 items-center">
              <MagnifyingGlassIcon class="w-4 h-4" />
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Search accounts"
                class="flex-1 border-none outline-none"
              >
            </div>
            <div
              v-for="account in filteredAccounts"
              :key="account._id"
              @click="switchAccount(account._id)"
              class="py-4 px-4 border-t border-t-gray-300 text-gray-700 hover:bg-slate-200 cursor-pointer"
            >
              <!-- <router-link :to="{ name: 'projects' }"> -->
                <div class="flex items-center justify-between">
                  <div>
                    <div>{{ account.name }}</div>
                    <div class="text-sm text-gray-400">
                      {{ figureWithUnit(projects.filter(p => p.accountId === account._id).length, 'project') }}
                    </div>
                  </div>
                  <div class="flex flex-col items-center gap-1">
                    <div v-if="currentAccount?._id === account._id">
                      <CheckIcon class="w-5 h-5" />
                    </div>
                    <div v-if="account.owner._id === user?._id"
                      title="You own this account"
                      class="badge badge-sm badge-primary"
                    >
                      owner
                    </div>
                  </div>
                  
                </div>
              <!-- </router-link> -->
            </div>
          </div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";
import { useRouter } from 'vue-router';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  PopoverOverlay
} from '@headlessui/vue';
import { CheckIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/solid';
import { store } from "@/app-utils";
import { figureWithUnit } from '@/core';

const currentAccount = store.currentAccount;
const accounts = store.accounts;
const projects = store.projects;
const user = store.user;
const searchTerm = ref<string>();
const router = useRouter();

const filteredAccounts = computed(() => {
  if (!searchTerm.value) {
    return accounts.value;
  }

  const value = searchTerm.value;

  return accounts.value.filter(
    account => account.name.toLocaleLowerCase().includes(value.toLocaleLowerCase())
  );
})

function switchAccount(id: string) {
  router.push({ name: 'projects' });
  store.setCurrentAccount(id);
  
}
</script>