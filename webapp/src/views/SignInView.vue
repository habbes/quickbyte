<template>
  <div class="flex flex-1 flex-col justify-center items-center min-h-full px-4">
    <p
      class="text-white text-center mb-4"
      style="font-family: 'Secular One'">
      You need an account to transfer files with Quickbyte.
    </p>
    <div>
      <button type="button"
        class="btn"
        @click="signIn">
        Sign in or create account
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import Button from "@/components/Button.vue";
import { signIn } from "@/auth";
</script>
