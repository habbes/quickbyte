<template>
  <div class="flex w-full">
    <div class="border-r border-r-gray-800 w-72">
      <div v-for="item in menuItems" :key="item.name">
        <div class="px-4 py-4 flex flex-col gap-2 text-gray-500 border-b border-gray-700 shadow-sm drop-shadow-md ">
          <div class="uppercase">
            {{ item.name }}
          </div>
          <div class="text-xs" v-if="item.subTitle">
            {{ item.subTitle }}
          </div>
        </div>
        <router-link
          v-for="subItem in item.subMenu" :key="subItem.name"
          class="px-4 py-2 border-b border-gray-700 flex text-gray-400 hover:text-gray-200"
          activeClass="text-gray-200 font-bold"
          exactActiveClass="text-gray-200 font-bold"
          :to="{ name: subItem.link }"
        >
          {{ subItem.name }}
        </router-link>
      </div>
      
    </div>
    <div class="px-5 py-5 bg-white flex-1 text-gray-800">
      <router-view></router-view>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, watch } from "vue";
import { store } from "@/app-utils";
import { ensure } from "@/core";
import { useRoute } from "vue-router";

type MenuItem = {
  name: string;
  subTitle?: string;
  subMenu: {
    name: string;
    link: string;
  }[];
}

const route = useRoute();

const menuItems = computed(() => {
  const account = ensure(store.currentAccount.value);
  const user = ensure(store.user.value);
  const result: MenuItem[] = [];
  if (account.owner._id === user._id) {
    result.push({
      name: 'Account',
      subTitle: `Manage ${account.name}`,
      subMenu: [
        {
          name: 'General',
          link: 'billing'
        },
        {
          name: 'Billing',
          link: 'billing'
        }
      ]
    })
  }
  result.push(
    {
      name: 'Personal',
      subMenu: [
        {
          name: 'Profile',
          link: 'billing'
        }
      ]
    }
  );
  
  return result;
});

watch(() => route.path, () => {
  const user = ensure(store.user.value, "Expected user to be available in settings");
  const ownedAccount = ensure(store.accounts.value.find(a => a.owner._id === user._id), 'Expected user to have owned account.');
  store.setCurrentAccount(ownedAccount._id);
});

</script>