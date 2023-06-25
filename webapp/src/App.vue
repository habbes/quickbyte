<script setup lang="ts">
import { signIn, useUser, signOut } from './auth.js'
import { useFileDialog } from '@vueuse/core';

const user = useUser();
const { open, files } = useFileDialog({ multiple: false });
</script>

<template>
  <div v-if="user">
    Hello {{ user.name  }}
    <button @click="signOut()">Sign Out</button>
    <div>
      <button @click="open()">Select file</button>
      <div v-for="file in files" :key="file.name">
        <div>Filename: {{ file.name  }}</div>
        <div>Size: {{ file.size/ (1024 * 1024 * 1024) }} GB</div>
      </div>
    </div>
  </div>
  <div v-else>
    <button @click="signIn">Sign In</button>
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
