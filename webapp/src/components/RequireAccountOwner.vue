<template>
  <template v-if="user && (account?.owner._id === user._id)">
    <slot></slot>
  </template>
</template>
<script lang="ts" setup>
import { store } from '@/app-utils';

const account = store.currentAccount;
const user = store.user;
</script>