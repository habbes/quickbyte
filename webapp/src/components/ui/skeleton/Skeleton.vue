<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/core/utils'

interface SkeletonProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<SkeletonProps>()
</script>

<template>
  <div :class="cn('animate-pulse rounded-md bg-slate-500 dark:bg-slate-800', props.class)" />
</template>
