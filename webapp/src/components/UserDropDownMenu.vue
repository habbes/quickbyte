<template>
  <!-- <div class="fixed top-16 w-56 text-right"> -->
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton>
      <div class="flex items-center gap-2 text-white">
        <div class="avatar placeholder">
          <div class="bg-primary-focus text-neutral-content text-center rounded-full w-8">
            <span class="text-xs">{{ user.name[0] }}</span>
          </div>
        </div>
      </div>
    </MenuButton>

    <MenuItems
      class="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none text-gray-700">
      <!-- <div class="px-1 py-1"> -->
      <MenuItem>
        <div class="py-4 px-4 flex flex-col items-center">
          <span class="font-bold text-lg">{{ user.name }}</span>
          <span class="text-sm">{{ user.email }}</span>
        </div>
      </MenuItem>
      <MenuItem>
        <div class="py-4 px-4">
          <router-link :to="{ name: 'billing' }" class="flex items-center gap-2">
            <CreditCardIcon class="w-5 h-5" />
            Billing
          </router-link>
        </div>
      </MenuItem>
      <MenuItem>
        <div class="py-4 px-4">
          <a href="https://quickbyte.featurebase.app" target="_blank" class="flex items-center gap-2">
            <StarIcon class="w-5 h-5" />
            Share feedback
          </a>
        </div>
      </MenuItem>
      <MenuItem>
        <div class="py-4 px-4">
          <a @click="auth.signOut()" class="flex items-center gap-2">
            <ArrowLeftStartOnRectangleIcon class="w-5 h-5" />
            Sign out
          </a>
        </div>
      </MenuItem>
      <!-- </div> -->
    </MenuItems>
  </Menu>
</template>
<script setup lang="ts">
import { auth } from "@/app-utils";
import type { User } from '@quickbyte/common';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { ArrowLeftStartOnRectangleIcon, CreditCardIcon, StarIcon } from "@heroicons/vue/24/solid";

defineProps<{
  user: User
}>();
</script>