<template>
  <form @submit.prevent="$emit('submit', $event)">
    <slot></slot>
  </form>
</template>
<script lang="ts" setup>
defineEmits<{
  (e: 'submit', event: Event): void;
}>();
</script>