<template>
  <header class="sticky inset-0 top-0 z-50 w-full" :style="{ height: `${layoutDimensions.landingNavBarHeight}px` }">
    <nav class="border-b px-6 border-[#131319] backdrop-blur-[12px] ">
      <div class="relative flex flex-wrap items-center justify-between gap-6 py-4 md:gap-0">
        <input id="toggle_nav" aria-hidden="true" type="checkbox" name="toggle_nav" class="hidden peer">
        <div class="relative top-0 z-50 flex justify-between w-full lg:w-max md:px-0">
          <div class="flex items-center gap-2 align-middle">
            <router-link to="/">
              <span class="text-md font-bold text-white">
                {{ account?.name }}
              </span>
            </router-link>
            <AccountsDropdown class="">
              <div class="cursor-pointer hover:bg-slate-800 rounded-sm py-2 px-1 flex items-center justify-center align-middle">
                <ChevronUpDownIcon class="w-5 h-5" />
              </div>
            </AccountsDropdown>
          </div>

          <div class="relative flex items-center justify-center w-8 h-8 rounded-full lg:hidden max-h-10">
            <label id="hamburger" role="button" for="toggle_nav" aria-label="humburger">
              <div id="line" aria-hidden="true" class="m-auto h-0.5 w-5 rounded bg-white transition duration-300" />
              <div id="line2" aria-hidden="true" class="m-auto mt-2 h-0.5 w-5 rounded bg-white transition duration-300" />
            </label>
          </div>
        </div>
        <div aria-hidden="true"
          class="fixed inset-0 z-10 w-screen h-screen transition duration-500 origin-bottom scale-y-0 bg-black backdrop-blur-[12px] peer-checked:origin-top peer-checked:scale-y-100 lg:hidden" />
        <div
          class="absolute left-0 z-20 flex-col flex-wrap justify-end invisible w-full gap-6 py-6 transition-all duration-300 origin-top scale-95 translate-y-1 opacity-0 rounded-3xl top-full lg:relative lg:scale-100 lg:peer-checked:translate-y-0 lg:translate-y-0 lg:flex lg:flex-row lg:items-center lg:gap-0 lg:p-0 lg:bg-transparent lg:w-7/12 lg:visible lg:opacity-100 lg:border-none peer-checked:scale-100 peer-checked:opacity-100 peer-checked:visible lg:shadow-none">
          <div class="w-full lg:pr-4 lg:w-auto lg:pt-0">
            <ul
              class="flex flex-col gap-6 font-medium tracking-wide text-black lg:text-sm lg:items-center lg:space-x-4 lg:flex-row lg:gap-0">
              <li v-if="user">
                <router-link :to="{ name: 'upload' }"
                  class="text-[#A1A1A1] transition-all duration-200 ease-in text-md md:px-2 hover:text-white"
                  exactActiveClass="text-white">Quick Transfer</router-link>
              </li>
              <li v-if="user">
                <router-link :to="{ name: 'projects' }"
                  class="text-[#A1A1A1] transition-all duration-200 ease-in text-md md:px-2 hover:text-white"
                  activeClass="text-white">Projects</router-link>
              </li>
              <li v-if="user">
                <router-link :to="{ name: 'transfers' }"
                  class="text-[#A1A1A1] transition-all duration-200 ease-in text-md md:px-2 hover:text-white"
                  activeClass="text-white">Transfers</router-link>
              </li>
              <li v-if="user">
                <TasksDropdown />
              </li>
              <!-- <FeaturebaseChangelog /> -->
              <li v-for="{ id, name, path } in navLinks" :key="id"
                class="pb-3 border-b border-[#131319] lg:border-none lg:pb-0">
                <router-link v-smooth-scroll :to="path"
                  class="text-[#A1A1A1] transition-all duration-200 ease-in text-md md:px-2 hover:text-white">
                  {{ name }}
                </router-link>
              </li>
              <li>
                <button v-if="!user" @click="auth.signIn()"
                  class="px-4 py-2 text-white bg-[#5B53FF] hover:bg-[#5237F9] transition duration-200 ease-in rounded-2xl">
                  Sign In
                </button>
                <UserDropDownMenu v-if="user" :user="user" />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  </header>
</template>
  
<script setup lang='ts'>
import { computed } from 'vue';
import { useUser, auth, store } from '@/app-utils';
import FeaturebaseChangelog from '@/components/FeaturebaseChangelog.vue';
import UserDropDownMenu from '@/components/UserDropDownMenu.vue';
import TasksDropdown from '@/components/TasksDropdown.vue';
import AccountsDropdown from './AccountSwitcherMenu.vue';
import { layoutDimensions } from '@/styles/dimentions.js';
import { ChevronUpDownIcon } from '@heroicons/vue/24/outline';

const user = useUser();
const account = store.currentAccount;

const navLinks = computed(() => {
  if (!user.value) {
    return [
      {
        id: 1,
        name: 'Features',
        path: '#features',
      },
      {
        id: 2,
        name: 'Pricing',
        path: '#pricing',
      },

      {
        id: 4,
        name: 'FAQs',
        path: '#faqs',
      },
    ]
  }

  return [];
})
</script>
  
<style scoped>
#toggle_nav:checked~div #hamburger #line {
  @apply rotate-45 translate-y-1.5
}

#toggle_nav:checked~div #hamburger #line2 {
  @apply -rotate-45 -translate-y-1
}
</style>