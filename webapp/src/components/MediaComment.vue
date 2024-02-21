<template>
  <div>
    <MediaCommentInner
      :comment="comment"
      :htmlId="htmlId"
      :selected="selected"
      :nestingLevel="0"
      @click="$emit('click', comment)"
      @reply="$emit('reply', $event, comment._id)"
    />
    <MediaCommentInner
      v-for="reply in comment.children"
      :key="reply._id"
      :comment="reply"
      :htmlId="getHtmlId(reply)"
      :nestingLevel="1"
      @click="$emit('click', reply)"
      @reply="$emit('reply', $event, comment._id)"
    />
  </div>
</template>
<script lang="ts" setup>
import type { CommentWithAuthor, WithChildren, Comment } from "@quickbyte/common";
import MediaCommentInner from "./MediaCommentInner.vue";

const props = defineProps<{
  comment: WithChildren<CommentWithAuthor>;
  htmlId: string;
  selected?: boolean;
  getHtmlId: (comment: Comment) => string;
}>();

defineEmits<{
  (e: 'click', comment: CommentWithAuthor): void;
  (e: 'reply', text: string, parentId: string): void
}>();

// NOTE: At the moment we don't support nested replies
// so we assume all replies are to the top-level parent component
</script>