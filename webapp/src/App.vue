<!-- <template>
  <div class="relative flex flex-col flex-1 min-h-screen">
    <div class="top-0 left-0 right-0 ">
      <header class="flex flex-row items-center justify-between h-20 px-4 sm:px-10 md:px-14 py-7">
        <div id="logo" class="relative text-xl text-white" style="font-family: 'Orbit'">
          <router-link :to="{ name: 'upload' }">
            Quickbyte
          </router-link>
        </div>
        <div class="flex items-center gap-4">
          <FeaturebaseChangelog class="text-white"/>
          <div v-if="user">
            <UserDropDownMenu :user="user"/>
          </div>
        </div>
      </header>
    </div>
    <Toast />
    <router-view></router-view>
    <FeaturebaseFeedback />
    <FeaturebaseUserConnect v-if="userAccount" :user="userAccount" />
  </div>
</template>
<script lang="ts" setup>
import { watch, onErrorCaptured } from 'vue';
import { useUser, initAuth, initUserData, logger, store, showToast } from "@/app-utils";
import UserDropDownMenu from './components/UserDropDownMenu.vue';
import Toast from '@/components/Toast.vue';
import FeaturebaseUserConnect from '@/components/FeaturebaseUserConnect.vue';
import FeaturebaseChangelog from '@/components/FeaturebaseChangelog.vue';
import FeaturebaseFeedback from './components/FeaturebaseFeedback.vue';

const user = useUser();
initAuth();
const userAccount = store.userAccount;

watch(user, async () => {
  if (!user.value) return;

  logger.log('User update, refreshing data');
  try {
    await initUserData();
  } catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e.message, e);
  }
});

onErrorCaptured((error: Error) => {
  logger.error(error.message, error);
  showToast(error.message, 'error');
});
</script> -->

<template>
  <div class="flex flex-col items-center justify-between w-full min-h-screen  mx-auto max-w-7xl">
    <Navbar />
    <div class="space-y-10 md:space-y-40">
        
        <!-- <div>
          
        </div> -->
        <router-view />
      <FooterSection />
    </div>
    <Toast />
  </div>
</template>

<script setup lang='ts'>
import { onMounted, watch, onErrorCaptured } from 'vue';
import { useUser, initAuth, initUserData, logger, store, showToast } from "@/app-utils";
// AOS stands for Animate On Scroll, is a library that adds cool animations to elements as you scroll down a webpage.
import AOS from 'aos';
import Navbar from '@/components/Header/Navbar.vue';
import FooterSection from '@/components/Sections/FooterSection.vue';
import Toast from '@/components/Toast.vue';

const user = useUser();
initAuth();
const userAccount = store.userAccount;

onMounted(() => {
  AOS.init()
});

watch(user, async () => {
  if (!user.value) return;

  logger.log('User update, refreshing data');
  try {
    await initUserData();
  } catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e.message, e);
  }
});
</script>
