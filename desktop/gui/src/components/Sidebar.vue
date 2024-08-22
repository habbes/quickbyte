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
    <div class="flex-1">
      
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
import { store } from "@/app-utils";

const user = store.user;
</script>