<template>
  <details ref="dropdown" class="dropdown dropdown-end">
    <summary class="m-1 btn btn-sm btn-ghost text-white inline-flex items-center">
      {{ user.name }}
      <div class="avatar placeholder">
        <div class="bg-primary-focus text-neutral-content rounded-full w-8">
          <span class="text-xs">{{ user.name[0] }}</span>
        </div>
      </div>
    </summary>
    <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-52">
      <li @click="closeDropdown()">
        <router-link :to="{ name: 'billing' }">
          <CreditCardIcon class="w-6 h-6" />
          Billing
        </router-link>
      </li>
      <Separator />
      <li @click="closeDropdown()">
        <a @click="auth.signOut()">
          <ArrowLeftOnRectangleIcon class="w-6 h-6" />
          Sign out
        </a>
      </li>
    </ul>
  </details>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { auth } from "@/app-utils";
import type { User } from '@/core';
import { ArrowLeftOnRectangleIcon, CreditCardIcon } from "@heroicons/vue/24/outline";
import Separator from "./Separator.vue";

const props = defineProps<{
  user: User
}>();

const dropdown = ref<HTMLElement>();

function closeDropdown() {
  dropdown.value?.removeAttribute('open');
}
</script>