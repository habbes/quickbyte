<template>
  <div class="flex flex-1 justify-center items-center min-h-full" style="height:100vh">
    <Button @click="signIn">Sign in or create account to get started</Button>
  </div>
</template>
<script setup lang="ts">
import Button from "@/components/Button.vue";
import { signIn } from "@/auth";
</script>
