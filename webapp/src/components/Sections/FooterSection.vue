<template>
  <footer class="w-full px-4 py-10 mx-auto border-t border-[#131319] sm:px-6 lg:px-8">
    <Container>
      <div class="grid w-full grid-cols-1 gap-6 mb-10 md:flex md:justify-between md:grid-cols-3">
        <div class=" col-span-full lg:col-span-1 lg:block">
          <div>
            <router-link to="/" class="flex-none text-xl font-semibold text-white font-Orbit" aria-label="Quickbyte">
              Quickbyte
            </router-link>
          </div>
          <p class="mt-3 text-xs text-[#A1A1A1] hover:text-white transition-all duration-200 ease-in sm:text-sm ">
            <a href="https://manuscript.live/" target="_blank">
              A product of Alpha Manuscript
              Limited
            </a>
          </p>
          <p class="mt-3 text-xs text-[#A1A1A1] sm:text-sm ">
            &copy; {{ newDate }} <span class="font-Orbit">Quickbyte</span>. All
            rights reserved.
          </p>
        </div>

        <div class="flex space-x-20">
          <div v-for="footer in footerNav" :key="footer.id">
            <h4 class="text-xs font-semibold text-white uppercase ">
              {{ footer.name }}
            </h4>
            <div v-for="nav in footer.children" :key="nav.id">
              <div class="grid mt-3 space-y-3 text-sm">
                <a :href="nav.path" target="_blank"
                  class="text-[#A1A1A1] transition-all duration-200 ease-in text-xs md:text-md hover:text-white inline-flex gap-x-2">
                  {{ nav.name }}
                </a>
              </div>
            </div>
          </div>
          <div class="hidden md:block md:space-y-3">
            <div>
              <h4 class="text-xs font-semibold text-white uppercase ">
                Socials
              </h4>
            </div>

            <div class="flex flex-col w-10 space-y-2 md:space-y-0 md:flex-row md:space-x-4">
              <div v-for="{ icon, link, id } in socialIcons" :key="id">
                <a :href="link" target="_blank">
                  <Icon :icon="icon"
                    class="text-[#A1A1A1] transition-all cursor-pointer duration-200 ease-in md:text-lg hover:text-white inline-flex gap-x-2" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3 md:hidden">
          <div>
            <h4 class="text-xs font-semibold text-white uppercase ">
              Socials
            </h4>
          </div>

          <div class="flex flex-col w-10 space-y-2 md:space-y-0 md:flex-row md:space-x-4">
            <div v-for="{ icon, link, id } in socialIcons" :key="id">
              <a :href="link" target="_blank">
                <Icon :icon="icon"
                  class="text-[#A1A1A1] transition-all cursor-pointer duration-200 ease-in md:text-lg hover:text-white inline-flex gap-x-2" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </Container>
  </footer>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Container from '@/components/base/Container.vue'
const newDate = new Date().getFullYear()
const footerNav = [
  {
    id: 1,
    name: 'PRIVACY',
    children: [
      {
        id: 1,
        name: 'Your privacy choices',
        path: '#',
      },

      {
        id: 2,
        name: 'Notice at collection',
        path: '#',
      },
    ],
  },
  {
    id: 2,
    name: 'LEGAL',
    children: [
      {
        id: 1,
        name: 'Terms and Conditions',
        path: 'https://www.iubenda.com/terms-and-conditions/64965646',
      },

      {
        id: 2,
        name: 'Privacy Policy',
        path: 'https://www.iubenda.com/privacy-policy/64965646',
      },

      {
        id: 3,
        name: 'Cookie Policy',
        path: 'https://www.iubenda.com/privacy-policy/64965646/cookie-policy',
      },
    ],
  },
]

const socialIcons = [
  {
    id: 1,
    icon: 'mdi:twitter',
    link: 'https://twitter.com/QuickbyteHQ',
  },
  {
    id: 2,
    icon: 'bi:youtube',
    link: 'https://www.youtube.com/@QuickbyteHQ',
  },
]
</script>

