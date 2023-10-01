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
          <details class="dropdown dropdown-end">
            <summary class="m-1 btn btn-sm btn-ghost text-white inline-flex items-center">
              {{ user.name }}
              <div class="avatar placeholder">
                <div class="bg-primary-focus text-neutral-content rounded-full w-8">
                  <span class="text-xs">{{ user.name[0] }}</span>
                </div>
              </div>
            </summary>
            <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-52">
              <li>
                <router-link :to="{ name: 'billing' }">
                  <CreditCardIcon class="w-6 h-6" />
                  Billing
                </router-link>
              </li>
              <Separator />
              <li>
                <a @click="auth.signOut()">
                  <ArrowLeftOnRectangleIcon class="w-6 h-6" />
                  Sign out
                </a>
              </li>
            </ul>
          </details>
        </div>
      </header>
    </div>
    <Toast />
    <router-view></router-view>
  </div>
</template>
<script lang="ts" setup>
import { watch } from 'vue';
import { useUser, auth, initAuth, initUserData, logger } from "@/app-utils";
import Toast from '@/components/Toast.vue';
import Separator from './components/Separator.vue';
import { ArrowLeftOnRectangleIcon, CreditCardIcon } from "@heroicons/vue/24/outline";

const user = useUser();
initAuth();

watch(user, async () => {
  if (!user.value) return;

  logger.log('User update, refreshing data');
  await initUserData();
});
</script>