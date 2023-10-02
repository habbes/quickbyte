<template>
  <div class="flex flex-col flex-1 min-h-screen relative">
    <div class="absolute top-0 left-0 right-0">
      <header class="flex flex-row justify-between items-center h-20 px-4 sm:px-10 py-7">
        <div id="logo" class="text-white text-lg relative" style="font-family: 'Orbit'">
          <router-link :to="{ name: 'upload' }">
            Quickbyte
          </router-link>
        </div>
        <div v-if="user">
          <UserDropDownMenu :user="user"/>
        </div>
      </header>
    </div>
    <Toast />
    <router-view></router-view>
  </div>
</template>
<script lang="ts" setup>
import { watch } from 'vue';
import { useUser, initAuth, initUserData, logger } from "@/app-utils";
import UserDropDownMenu from './components/UserDropDownMenu.vue';
import Toast from '@/components/Toast.vue';

const user = useUser();
initAuth();

watch(user, async () => {
  if (!user.value) return;

  logger.log('User update, refreshing data');
  await initUserData();
});
</script>