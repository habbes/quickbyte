<template>
  <div>
    <div  
      class="commentsList overflow-y-auto flex flex-col"
      :class="{
        'sm:h-[calc(100dvh-248px)]': !offsetTabHeader,
        'sm:h-[calc(100dvh-278px)]': offsetTabHeader
      }"
    >
      <MediaComment
        v-if="user"
        v-for="comment in comments"
        :key="comment._id"
        :comment="comment"
        :htmlId="getHtmlCommentId(comment)"
        :getHtmlId="getHtmlCommentId"
        :selectedId="selectedCommentId"
        :selected="comment._id === selectedCommentId"
        :currentUserId="user._id"
        :currentRole="role"
        @click="$emit('clickComment', $event)"
        @reply="handleReplyComment"
        @delete="showDeleteCommentDialog($event)"
        @edit="handleEditComment"
      />
    </div>

    <div class="px-5 py-5 border-t border-t-[#120c11] flex flex-col gap-2 h-[150px] sm:h-[200px]">
      <div class="flex-1 bg-[#604a59] rounded-md p-2 flex flex-col gap-2 ">
        
        <div class="flex flex-row items-center justify-between">
          <div class="flex flex-1">
            <DrawingTools
              v-if="(includeTimestamp && mediaType === 'video') || mediaType === 'image'"
              v-model:active="drawingToolsActive"
              @selectTool="annotationsDrawingTool = $event"
              @undo="canvasController.undoShape()"
              @redo="canvasController.redoShape()"
              @update:active="$event && $emit('commentInputFocus')"
            />
          </div>
          <div
            v-if="(mediaType === 'video' || mediaType === 'audio') && !drawingToolsActive"
            class="flex flex-row items-center gap-1" title="Save comment at the current timestamp"
          >
            <ClockIcon class="h-5 w-5"/>
            <span>{{ formatTimestampDuration(currentTimestamp) }}</span>
            <input
              v-model="includeTimestamp"
              type="checkbox"
              class="checkbox checkbox-xs checkbox-accent"
            >
          </div>
        </div>
        <!--
          Stop propagation of keyboard events when the comment box is in focus
          to avoid triggering the global spacebar watcher and accidentally
          playing the video.
        -->
        <textarea
          class="bg-[#604a59] border-0 hover:border-0 outline-none w-full flex-1 resize-none"
          placeholder="Type your comment here"
          @focus="$emit('commentInputFocus')"
          @keyup.stop=""
          @keydown.stop=""
          v-model="commentInputText"
        >
        </textarea>
      </div>
      <div class="flex gap-2 items-center">
        <button class="btn btn-primary btn-xs" @click="handleTopLevelSend()">Send</button>
      </div>
    </div>
  </div>
  <DeleteCommentDialog
    ref="deleteCommentDialog"
    v-if="deleteComment"
    :deleteComment="deleteComment"
    @deleted="handleCommentDeleted($event)"
  />
</template>
<script lang="ts" setup>
import { ref, computed, nextTick } from "vue";
import { formatTimestampDuration } from "@/core";
import type { MediaType, CommentWithAuthor, WithChildren, RoleType } from "@quickbyte/common";
import MediaComment from "./MediaComment.vue";
import { DrawingTools, type DrawingToolConfig, type CanvasController } from "@/components/canvas";
import type { DeleteCommentHandler } from "@/components/player";
import { ClockIcon } from "@heroicons/vue/24/outline";
import DeleteCommentDialog from "@/components/DeleteCommentDialog.vue";

const props = defineProps<{
  mediaType: MediaType;
  user?: {
    _id: string;
    name: string;
  },
  role: RoleType; 
  comments: WithChildren<CommentWithAuthor>[],
  smallScreenHeight: string;
  currentTimestamp: number;
  canvasController: CanvasController;
  /**
   * Whether a 30px tab header is placed above the comments panel.
   * This contributes to the height allocated for the tabs list.
   * This is kind of hack, but makes it easy to adjust the height
   * of the comments panel for common scenarios.
   */
  offsetTabHeader?: boolean;
  deleteComment?: DeleteCommentHandler
}>();

const emit = defineEmits<{
  (e: 'clickComment', comment: CommentWithAuthor): unknown;
  (e: 'commentDeleted', comment: CommentWithAuthor): unknown;
  (e: 'replyComment', args: { text: string, parentId: string }): unknown;
  (e: 'editComment', args: { commentId: string, text: string }): unknown;
  (e: 'commentInputFocus'): unknown;
  (e: 'sendTopLevelComment', args: { text?: string, includeTimestamp: boolean }): unknown;
}>();

defineExpose({ scrollToComment });

const deleteCommentDialog = ref<typeof DeleteCommentDialog>();
const commentInputText = defineModel<string>('input');
const selectedCommentId = defineModel('selectedCommentId');
const includeTimestamp = ref<boolean>(true);
const drawingToolsActive = defineModel('drawingToolsActive', { default: false });
const annotationsDrawingTool = defineModel<DrawingToolConfig>('annotationsDrawingTool');

function scrollToComment(comment: CommentWithAuthor) {
  // we wait for the next tick to ensure the comment has been added to the DOM
  // before we scroll into it
  nextTick(() => {
    document.querySelector(`#${getHtmlCommentId(comment)}`)?.scrollIntoView({
      block: 'end',
      inline: 'nearest',
      behavior: 'smooth'
    });
  });
}

function getHtmlCommentId(comment: CommentWithAuthor) {
  return `comment_${comment._id}`;
}

function showDeleteCommentDialog(comment: CommentWithAuthor) {
  deleteCommentDialog.value?.open(comment);
}

function handleReplyComment(text: string, parentId: string) {
  emit('replyComment', { text, parentId });
}

function handleEditComment(commentId: string, text: string) {
  emit('editComment', { commentId, text });
}

function handleTopLevelSend() {
  emit('sendTopLevelComment', {
    text: commentInputText.value,
    includeTimestamp: includeTimestamp.value
  });
}

function handleCommentDeleted(comment: CommentWithAuthor) {
  emit('commentDeleted', comment);
}


</script>
<style scoped>

@media (max-width: 640px) {
  .commentsList {
    height: v-bind('smallScreenHeight');
  }
}

</style>