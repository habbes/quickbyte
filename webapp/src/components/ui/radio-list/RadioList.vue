<template>
  <RadioGroupRoot
    v-model="value"
    class="flex flex-col items-start gap-2"  
  >
    <slot></slot>
  </RadioGroupRoot>
</template>
<script lang="ts" setup>
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'radix-vue'
import { defineModel } from 'vue'

const value = defineModel<string>();
</script>