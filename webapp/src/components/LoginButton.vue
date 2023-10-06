<template>
  <div class="flex flex-col justify-center items-center">
    <div>
      <button type="button"
        class="btn"
        @click="auth.signIn()">
        Sign in or create account
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import Button from "@/components/Button.vue";
import { auth } from "@/app-utils";
</script>
