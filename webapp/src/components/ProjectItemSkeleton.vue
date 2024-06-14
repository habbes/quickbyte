<template>
  <div class="h-full w-full flex flex-col">
    <div class="flex h-full flex-col space-y-3">
      <div class="flex-1">
        <UiSkeleton class="h-full w-full rounded-xl" />
      </div>
      <div class="h-12 space-y-2">
        <UiSkeleton class="h-4 w-full" />
        <UiSkeleton class="h-4 w-full" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { UiSkeleton } from '@/components/ui';
</script>