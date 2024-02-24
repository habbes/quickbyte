<template>
  <div>
    <MediaCommentInner
      :comment="comment"
      :htmlId="htmlId"
      :selected="selected"
      :nestingLevel="0"
      :deletable="currentUserId === comment.author._id || currentRole === 'admin' || currentRole === 'owner'"
      @click="$emit('click', comment)"
      @reply="$emit('reply', $event, comment._id)"
      @delete="$emit('delete', $event)"
    />
    <MediaCommentInner
      v-for="reply in comment.children"
      :key="reply._id"
      :comment="reply"
      :htmlId="getHtmlId(reply)"
      :nestingLevel="1"
      :deletable="currentUserId === reply.author._id || currentRole === 'admin' || currentRole === 'owner'"
      @click="$emit('click', reply)"
      @reply="$emit('reply', $event, comment._id)"
      @delete="$emit('delete', $event)"
    />
  </div>
</template>
<script lang="ts" setup>
import type { CommentWithAuthor, RoleType, WithChildren } from "@quickbyte/common";
import MediaCommentInner from "./MediaCommentInner.vue";

// NOTE: At the moment we don't support nested replies
// so we assume all replies are to the top-level parent component

const props = defineProps<{
  comment: WithChildren<CommentWithAuthor>;
  htmlId: string;
  selected?: boolean;
  getHtmlId: (comment: CommentWithAuthor) => string;
  currentUserId: string;
  currentRole: RoleType;
}>();

defineEmits<{
  (e: 'click', comment: CommentWithAuthor): void;
  (e: 'reply', text: string, parentId: string): void;
  (e: 'delete', comment: CommentWithAuthor): void;
}>();

</script>