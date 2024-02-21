<template>
  <div
      :id="htmlId"
      class="px-5 py-5 border-b border-b-[#120c11] last:border-b-0"
      :class="{ 'bg-[#120c11]': selected }"
    >
      <div class="flex flex-row items-center justify-between mb-2">
        <div class="flex flex-row items-center gap-2">
          <span class="text-sm text-white">{{ comment.author.name }}</span>
          <span :title="`Posted on ${new Date(comment._createdAt).toLocaleString()} `">{{ new Date(comment._createdAt).toLocaleDateString() }}</span>
        </div>
        <span
          v-if="comment.timestamp !== undefined"
          @click="$emit('click', comment)"
          title="Jump to this time in the video"
          class="font-semibold text-blue-300 hover:cursor-pointer"
        >
          {{ formatTimestampDuration(comment.timestamp) }}
        </span>
      </div>
      <div class="text-xs whitespace-pre-line">
        {{ comment.text }}
      </div>
    </div>
</template>
<script lang="ts" setup>
import type { CommentWithAuthor } from "@quickbyte/common";
import { formatTimestampDuration} from "@/core";

defineProps<{
  comment: CommentWithAuthor;
  htmlId: string;
  selected?: boolean;
}>();

defineEmits<{
  (e: 'click', comment: CommentWithAuthor): void;
}>();
</script>