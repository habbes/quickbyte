<template>
  <button type="button"
    class="btn w-full md:w-auto md:btn-lg"
    @click="auth.signIn()">
    Sign in or create account
  </button>
</template>
<script setup lang="ts">
import Button from "@/components/Button.vue";
import { auth } from "@/app-utils";
</script>
