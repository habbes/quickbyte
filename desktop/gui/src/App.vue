<template>
  <div class="h-screen flex items-stretch bg-[#24141f]">
    <div class="w-[250px] text-white flex flex-col">
      <div class="flex items-center border-b-[0.5px] border-b-gray-700 h-12 px-2">
        Username
      </div>
      <div class="flex-1">
        
      </div>
      <div class="flex items-center border-t-[0.5px] border-t-gray-700 h-12 px-2">
        Transfers
      </div>
    </div>
    <div class="flex-1 h-full bg-[#2a2638] text-white">
      <div>
          <div>
            Upload files
          </div>
          <div>
            Download from shared link
          </div>
        </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted } from "vue";
import { invoke } from '@tauri-apps/api'

onMounted(async () => {
  console.log(await invoke('greet', { name: 'World' }))
})
</script>
