<template>
  <div>
    <MediaCommentCore
      :comment="comment"
      :htmlId="htmlId"
      :selected="comment._id === selectedId"
      :nestingLevel="0"
      :deletable="currentUserId === comment.author._id || currentRole === 'admin' || currentRole === 'owner'"
      :editable="currentUserId === comment.author._id"
      @click="$emit('click', comment)"
      @reply="$emit('reply', $event, comment._id)"
      @delete="$emit('delete', $event)"
      @edit="$emit('edit', comment._id, $event)"
    />
    <MediaCommentCore
      v-for="reply in comment.children"
      :key="reply._id"
      :comment="reply"
      :htmlId="getHtmlId(reply)"
      :selected="reply._id === selectedId"
      :nestingLevel="1"
      :deletable="currentUserId === reply.author._id || currentRole === 'admin' || currentRole === 'owner'"
      :editable="currentUserId === reply.author._id"
      @click="$emit('click', { ...reply, parent: comment })"
      @reply="$emit('reply', $event, comment._id)"
      @delete="$emit('delete', $event)"
      @edit="$emit('edit', reply._id, $event)"
    />
  </div>
</template>
<script lang="ts" setup>
import type { CommentWithAuthor, WithParent, RoleType, WithChildren } from "@quickbyte/common";
import MediaCommentCore from "./MediaCommentCore.vue";

// NOTE: At the moment we don't support nested replies
// so we assume all replies are to the top-level parent component

defineProps<{
  comment: WithChildren<CommentWithAuthor>;
  htmlId: string;
  /**
   * The ID of the selected comment
   */
  selectedId?: string;
  getHtmlId: (comment: CommentWithAuthor) => string;
  currentUserId: string;
  currentRole: RoleType;
}>();

defineEmits<{
  (e: 'click', comment: WithParent<CommentWithAuthor>): void;
  (e: 'reply', text: string, parentId: string): void;
  (e: 'edit', commentId: string, text: string): void;
  (e: 'delete', comment: CommentWithAuthor): void;
}>();

</script>