<template>
  <UiDialog ref="dialog" :title="'Delete comment'">
    <div>
      Are you sure you want to delete the comment?
    </div>
    <template #actions>
      <div class="flex gap-2">
        <UiButton @click="close()">Cancel</UiButton>
        <UiButton @click="deleteComment()" danger>Delete</UiButton>
      </div>
    </template>
  </UiDialog>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { UiDialog, UiButton } from "@/components/ui";
import { trpcClient, logger, showToast } from "@/app-utils";
import type { CommentWithAuthor } from "@quickbyte/common";
import { ensure } from "@/core";

const props = defineProps<{
  deleteComment: (args: {
    commentId: string;
    parentId?: string;
  }) => Promise<unknown>;
}>();

const emit = defineEmits<{
  (e: 'deleted', comment: CommentWithAuthor): void;
}>();

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();
const comment = ref<CommentWithAuthor>();

function close() {
  dialog.value?.close();
}

// This dialog has an unconventional/unintutive design compared to other dialogs in this app.
// Usually, I would pass the comment as a prop. However, I designed this dialog
// to be used as a single instance in a comment that displays many comments and each
// comment would be deleted by the same dialog instance. This means that you would
// have to change the value passed to the prop each time before calling open().
// However, it could happen that when you change the comment prop's value and call open()
// Vue has not committed the updates yet, and maybe you need to use nextTick. This
// can introduce bugs are unexpected results.
// In retrospect, I should probably have encapsulate a DeleteMediaComment component
// instance in each MediaCommentInner component

function open(commentToDelete: CommentWithAuthor) {
  ensure(commentToDelete, 'Expected comment to be passed to DeleteCommentDialog.open() but was not passed.');
  comment.value = commentToDelete;
  dialog.value?.open();
}

async function deleteComment() {
  if (!comment.value) return;

  try {

    await props.deleteComment({
      commentId: comment.value._id,
      parentId: comment.value.parentId
    });
    
    emit('deleted', comment.value);
    close();
  }
  catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}
</script>