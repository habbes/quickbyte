<template>
  <SwitcherMenu
    v-model:search="searchTerm"
    :searchPlaceholder="'Search accounts'"
  >
    <UiPopoverButton as="div"
        v-for="account in filteredAccounts"
        :key="account._id"
        @click="switchAccount(account._id)"
        class="py-4 px-4 border-t border-t-gray-300 text-gray-700 hover:bg-slate-200 cursor-pointer"
    >
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
    </UiPopoverButton>
  </SwitcherMenu>
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";
import { useRouter } from 'vue-router';
import { CheckIcon } from '@heroicons/vue/24/solid';
import { store } from "@/app-utils";
import { figureWithUnit } from '@/core';
import SwitcherMenu from "./SwitcherMenu.vue";
import UiPopoverButton from "@/components/ui/UiPopoverButton.vue";

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