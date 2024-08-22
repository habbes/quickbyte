<template>
  <div>
    <h2>Welcome to Quickbyte Transfer</h2>
    <div>
      <div>
        <h3>Start a transfer</h3>
        <div>
          Upload files to share with a client
        </div>
        <router-link :to="{ name: 'upload' }">Get started</router-link>
      </div>
      <div>
        <h3>Download from a shared link</h3>
        <div>
          Download files shared to you from a Quickbyte link.
        </div>
        <router-link :to="{ name: 'download' }">Get started.</router-link>
      </div>
      <div>
        <h3>Access projects</h3>
        <div>
          Upload or download files to your Quickbyte projects.
        </div>
      </div>
    </div>
    <router-view></router-view>
  </div>
</template>
<script setup lang="ts">
import { onMounted } from "vue";
import { invoke } from '@tauri-apps/api'

onMounted(async () => {
  console.log(await invoke('greet', { name: 'World' }))
})
</script>
