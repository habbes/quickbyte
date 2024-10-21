<template>
  <div class="flex">
    <div class="border-r border-r-gray-800 w-64">
      <div v-for="item in menuItems" :key="item.name">
        <div class="px-4 py-4 text-gray-500 uppercase border-b border-gray-700 shadow-sm drop-shadow-md ">
          {{ item.name }}
        </div>
        <router-link
          v-for="subItem in item.subMenu" :key="subItem.name"
          class="px-4 py-2 border-b border-gray-700 flex text-gray-400 hover:text-gray-200"
          activeClass="text-gray-200 font-bold"
          exactActiveClass="text-gray-200 font-bold"
          :to="{ name: subItem.link }"
        >
          {{ subItem.name }}
        </router-link>
      </div>
      
    </div>
    <div class="px-5 py-5">
      <router-view></router-view>
    </div>
  </div>
</template>
<script lang="ts" setup>

const menuItems = [
  {
    name: 'Account',
    subMenu: [
      {
        name: 'General',
        link: 'billing'
      },
      {
        name: 'Billing',
        link: 'billing'
      }
    ]
  },
  {
    name: 'Personal',
    subMenu: [
      {
        name: 'Profile',
        link: 'billing'
      }
    ]
  }
]

</script>