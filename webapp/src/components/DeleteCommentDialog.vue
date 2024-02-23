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

const props = defineProps<{
  /**
   * The comment to delete. This is nullable
   * because it's expected that the same component
   * instance may be re-used to delete different comments.
   * But make sure to set the comment prop before calling
   * the open() method.
   */
  comment?: CommentWithAuthor
}>();

const emit = defineEmits<{
  (e: 'deleted', comment: CommentWithAuthor): void;
}>();

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();

function close() {
  dialog.value?.close();
}

function open() {
  if (!props.comment) return;
  dialog.value?.open();
}

async function deleteComment() {
  if (!props.comment) return;
  try {
    await trpcClient.deleteMediaComment.mutate({
      projectId: props.comment.projectId,
      commentId: props.comment._id,
      mediaId: props.comment.mediaId
    });
    
    emit('deleted', props.comment);
    close();
  }
  catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}
</script>