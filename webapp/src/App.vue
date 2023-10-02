<template>
  <div class="flex flex-col flex-1 min-h-screen relative">
    <div class="absolute top-0 left-0 right-0">
      <header class="flex flex-row justify-between items-center h-20 px-4 sm:px-10 py-7">
        <div id="logo" class="text-white text-xl relative" style="font-family: 'Orbit'">
          <router-link :to="{ name: 'upload' }">
            Quickbyte
          </router-link>
        </div>
        <div class="flex items-center gap-4">
          <FeaturebaseFeedback />
          <FeaturebaseChangelog class="text-white"/>
          <div v-if="user">
            <UserDropDownMenu :user="user"/>
          </div>
        </div>
      </header>
    </div>
    <Toast />
    <router-view></router-view>
    <FeaturebasePlugin v-if="userAccount" :user="userAccount" />
  </div>
</template>
<script lang="ts" setup>
import { watch } from 'vue';
import { useUser, initAuth, initUserData, logger, store } from "@/app-utils";
import UserDropDownMenu from './components/UserDropDownMenu.vue';
import Toast from '@/components/Toast.vue';
import FeaturebasePlugin from '@/components/FeaturebasePlugin.vue';
import FeaturebaseChangelog from '@/components/FeaturebaseChangelog.vue';
import FeaturebaseFeedback from './components/FeaturebaseFeedback.vue';

const user = useUser();
initAuth();
const userAccount = store.userAccount;

watch(user, async () => {
  if (!user.value) return;

  logger.log('User update, refreshing data');
  await initUserData();
});
</script>