<template>
  <div class="w-[250px] text-white flex flex-col">
    <div class="flex items-center border-b-[0.5px] border-b-gray-700 h-12 px-2 text-sm">
      Username
    </div>
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