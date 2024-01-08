<template>
  <Popover class="relative">
    <PopoverButton>
      <slot></slot>
    </PopoverButton>

    <PopoverPanel
      class="absolute z-10 mt-3 w-72 max-w-sm translate-x-[-40%] transform px-4 sm:px-0 lg:max-w-3xl"
    >
      <div class="overflow-hidden rounded-lg shadow-lg ring-1 ring-black/5">
        <div class="relative bg-white">
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
  </Popover>
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";
import {
  Popover,
  PopoverButton,
  PopoverPanel
} from '@headlessui/vue';
import { CheckIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/solid';
import { store } from "@/app-utils";
import { figureWithUnit } from '@/core';

const currentAccount = store.currentAccount;
const accounts = store.accounts;
const projects = store.projects;
const user = store.user;
const searchTerm = ref<string>();

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
  store.setCurrentAccount(id);
}
</script>