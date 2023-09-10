<template>
  <div class="border-b border-b-gray-100 py-1">
    <div class="flex justify-between items-center">
      <div>
          <div class="text-sm flex justify-between">
          <slot></slot>
          </div>
          <div class="text-sm text-gray-400 flex gap-2">
          <slot name="detail"></slot>
          </div>
      </div>
      <div>
          <slot name="icon"></slot>
      </div>
    </div>
  </div>
</template>