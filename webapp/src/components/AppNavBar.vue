<template>
  <header class="sticky inset-0 top-0 z-50 w-full flex flex-col justify-center" :style="{ height: `${layoutDimensions.navBarHeight}px` }">
    <nav class="px-6">
      <div class="relative flex flex-wrap items-center justify-between gap-6 md:gap-0">
        <div class="relative flex justify-between w-full">
          <div class="flex items-center gap-1 sm:gap-2 align-middle">
            <router-link to="/">
              <span class="text-md font-bold text-white">
                {{ account?.name }}
              </span>
            </router-link>
            <AccountsDropdown />
          </div>

          <div class="flex items-center lg:hidden gap-2">
            <div class="rounded-full border border-gray-600">
              <NotificationsMenu />
            </div>
            <div class="relative flex items-center justify-center border border-gray-600 w-8 h-8 rounded-full lg:hidden max-h-10">
              <label id="hamburger" role="button" for="toggle_nav" aria-label="humburger">
                <div id="line" aria-hidden="true" class="m-auto h-0.5 w-3.4 rounded bg-white transition duration-300" />
                <div id="line2" aria-hidden="true" class="m-auto mt-2 h-0.5 w-4 rounded bg-white transition duration-300" />
              </label>
            </div>
          </div>
        </div>
        <div aria-hidden="true"
          class="fixed inset-0 z-10 w-screen h-screen transition duration-500 origin-bottom scale-y-0 bg-black backdrop-blur-[12px] peer-checked:origin-top peer-checked:scale-y-100 lg:hidden" />
        <div
          @click="closeHamburgerMenu()"
          class="absolute left-0 z-20 flex-col flex-wrap justify-end invisible w-full gap-6 py-6 transition-all duration-300 origin-top scale-95 translate-y-1 opacity-0 rounded-3xl top-full lg:relative lg:scale-100 lg:peer-checked:translate-y-0 lg:translate-y-0 lg:flex lg:flex-row lg:items-center lg:gap-0 lg:p-0 lg:bg-transparent lg:w-7/12 lg:visible lg:opacity-100 lg:border-none peer-checked:scale-100 peer-checked:opacity-100 peer-checked:visible lg:shadow-none">
          <div class="w-full lg:pr-4 lg:w-auto lg:pt-0">
            <ul
              class="flex flex-col gap-4 sm:gap-6 font-medium tracking-wide lg:text-sm lg:items-center lg:space-x-4 lg:flex-row lg:gap-0 text-[#A1A1A1]"
            >
              <li v-if="user" class="sm:hidden">
                {{ user.email }}
              </li>
              <li class="sm:hidden border-b border-gray-600 m-0 p-0"></li>
              <li v-if="user">
                <router-link :to="{ name: 'projects' }"
                  class="text-[#A1A1A1] transition-all duration-200 ease-in text-md md:px-2 hover:text-white"
                  activeClass="text-white">Projects</router-link>
              </li>
              
              <RequireAccountOwner>
                <li class="sm:hidden border-b border-gray-600 m-0 p-0"></li>
                <li v-if="user">
                  <router-link :to="{ name: 'upload' }"
                    class="text-[#A1A1A1] transition-all duration-200 ease-in text-md md:px-2 hover:text-white"
                    exactActiveClass="text-white">Quick Transfer</router-link>
                </li>
              </RequireAccountOwner>
              <RequireAccountOwner>
                <li class="sm:hidden border-b border-gray-600 m-0 p-0"></li>
                <li v-if="user">
                  <router-link :to="{ name: 'transfers' }"
                    class="text-[#A1A1A1] transition-all duration-200 ease-in text-md md:px-2 hover:text-white"
                    activeClass="text-white">Transfers</router-link>
                </li>
              </RequireAccountOwner>
              <li class="hidden sm:inline-block">
                <a href="https://quickbyte.featurebase.app" target="_blank" class="flex items-center gap-2">
                  Share Feedback
                </a>
              </li>

              <li class="border-b border-gray-600 m-0 p-0 sm:hidden"></li>
              <li class="sm:hidden">
                <router-link :to="{ name: 'billing' }" class="flex items-center gap-2">
                  <CreditCardIcon class="h-5 w-5" />
                  Billing
                </router-link>
              </li>
              <li class="border-b border-gray-600 m-0 p-0 sm:hidden"></li>
              <li class="sm:hidden">
                <a href="https://quickbyte.featurebase.app" target="_blank" class="flex items-center gap-2">
                  <StarIcon class="w-5 h-5" />
                  Share Feedback
                </a>
              </li>
              <li class="border-b border-gray-600 m-0 p-0 sm:hidden"></li>
              <li class="sm:hidden">
                <a @click="auth.signOut()" class="flex items-center gap-2">
                  <ArrowLeftStartOnRectangleIcon class="w-5 h-5" />
                  Sign Out
                </a>
              </li>
              <li v-if="user" class="hidden sm:block">
                <div class="rounded-full border border-gray-600">
                  <NotificationsMenu />
                </div>
              </li>
              <li class="hidden sm:block">
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
import { ref, computed } from 'vue';
import { auth, store } from '@/app-utils';
import UserDropDownMenu from '@/components/UserDropDownMenu.vue';
import NotificationsMenu from '@/components/NotificationsMenu.vue';
import AccountsDropdown from './AccountSwitcherMenu.vue';
import { layoutDimensions } from '@/styles/dimentions.js';
import { ChevronUpDownIcon, ArrowLeftStartOnRectangleIcon, StarIcon, CreditCardIcon } from '@heroicons/vue/24/solid';
import RequireAccountOwner from './RequireAccountOwner.vue';

const user = store.user;
const account = store.currentAccount;

/*
The humburger menu appears on small screen sizes (mobile).
It's activated using css by hidden checkbox. The humburger
icon is wrapped inside a label element which references the checkbox
such that when the hamburger is clicked, it toggles the checkbox,
activating the menu.

However, clicking links inside the menu does not automatically close
the menu, so the following ref is used to manually toggle
the checkbox to close the menu when a menu item is clicked.
*/
const hamburgerMenuOpen = ref(false);

function closeHamburgerMenu() {
  hamburgerMenuOpen.value = false;
}

</script>
  
<style scoped>
#toggle_nav:checked~div #hamburger #line {
  @apply rotate-45 translate-y-1.5
}

#toggle_nav:checked~div #hamburger #line2 {
  @apply -rotate-45 -translate-y-1
}
</style>