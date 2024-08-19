<template>
  <div
      :id="htmlId"
      class="px-5 py-5 border-b border-b-[#120c11]"
      :class="{ 'bg-[#120c11]': selected }"
      @click="$emit('click', comment)"
    >
      <div :style="{ 'padding-left': `${nestingPadding}px` }">
        <div class="flex flex-row items-center justify-between mb-2">
          <div class="flex flex-row items-center gap-2">
            <span class="text-sm text-white">{{ comment.author.name }}</span>
            <span :title="`Posted on ${new Date(comment._createdAt).toLocaleString()} `">{{ new Date(comment._createdAt).toLocaleDateString() }}</span>
          </div>
          <div class="flex items-center gap-2">
            <div
              v-if="comment.annotations"
              title="This comment has drawn annotations"
            >
              <PaintBrushIcon class="h-3 w-3" />
            </div>
            <span
              v-if="comment.timestamp !== undefined"
              title="Jump to this time in the video"
              class="font-semibold text-blue-300 hover:cursor-pointer"
            >
              {{ formatTimestampDuration(comment.timestamp) }}
            </span>
          </div>
        </div>
        <div v-if="!isEditMode" class="text-xs whitespace-pre-line">
          {{ comment.text }}
        </div>
        <div v-else>
          <!-- prevent key stroke events from bubbling up
           to avoid interference with the global space
           bar listener which can trigger playback of the
           video/audio player.
           TODO: the fact that we have to manually find
           text boxes that could affect this is dirty.
           Maybe we should capture the events and stop
           propagation from a higher component?
           -->
          <UiExpandableTextInput
            v-model="editText"
            ref="editInput"
            fullWidth
            @keyup.stop
            @keydown.stop
          />
        </div>
        <div class="mt-3 mb-2 flex justify-between" v-if="!isEditMode">
          <span
            @click="startReply()"
            class="font-bold text-gray-500 hover:text-gray-200 cursor-pointer"
          >
            Reply
          </span>
          <div class="inline-flex gap-4">
            <span v-if="editable" title="Edit comment">
              <PencilIcon
                @click="startEdit()"
                class="w-4 h-4 cursor-pointer text-gray-500 hover:text-gray-200"
              />
            </span>
            <span v-if="deletable" title="Delete comment">
              <TrashIcon
                @click="$emit('delete', comment)"
                class="w-4 h-4 cursor-pointer text-gray-500 hover:text-gray-200"
              />
            </span>
          </div>
        </div>
      </div>
      <div v-if="isReplyMode && !isEditMode">
        <UiExpandableTextInput
          v-model="replyText"
          ref="replyInput"
          fullWidth
          @keydown.stop=""
          @keyup.stop=""
        />
      </div>
      <div v-if="isReplyMode && !isEditMode" class="flex justify-end gap-4 mt-2">
        <span
          @click="submitReply()"
          class="text-gray-300 hover:text-gray-200 cursor-pointer"
        >
          Send
        </span>
        <span
          class="text-gray-300 hover:text-gray-200 cursor-pointer"
          @click="cancelReply()"
        >
          Cancel
        </span>
      </div>
      <div v-else-if="isEditMode" class="flex justify-end gap-4 mt-2">
        <span
          @click="submitEdit()"
          class="text-gray-300 hover:text-gray-200 cursor-pointer"
        >
          Send
        </span>
        <span
          class="text-gray-300 hover:text-gray-200 cursor-pointer"
          @click="cancelEdit()"
        >
          Cancel
        </span>
      </div>
    </div>
</template>
<script lang="ts" setup>
import { ref, computed, nextTick } from "vue";
import type { CommentWithAuthor } from "@quickbyte/common";
import { formatTimestampDuration} from "@/core";
import { UiExpandableTextInput } from "@/components/ui";
import { PencilIcon, TrashIcon } from "@heroicons/vue/24/solid";
import { PaintBrushIcon } from "@heroicons/vue/24/outline";

const props = defineProps<{
  comment: CommentWithAuthor;
  htmlId: string;
  selected?: boolean;
  // nesting level. 0 is for top-level comments,
  // 1 for first-level of children, etc.
  nestingLevel: number;
  deletable?: boolean;
  editable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click', comment: CommentWithAuthor): void;
  (e: 'reply', text: string): void;
  (e: 'edit', text: string): void;
  (e: 'delete', comment: CommentWithAuthor): void;
}>();

const isReplyMode = ref(false);
const replyInput = ref<typeof UiExpandableTextInput>();
const replyText = ref<string>("");
const isEditMode = ref(false);
const editText = ref<string>();
const editInput = ref<typeof UiExpandableTextInput>();
const nestingPadding = computed(() => props.nestingLevel * 20);

function startReply() {
  isReplyMode.value = true;
  nextTick(() => replyInput.value?.focus());
}

function cancelReply() {
  replyText.value = "";
  isReplyMode.value = false;
}

function submitReply() {
  if (!replyText.value) return;
  emit('reply', replyText.value);
  cancelReply();
}

function startEdit() {
  isEditMode.value = true;
  editText.value = props.comment.text;
  nextTick(() => editInput.value?.focus());
}

function cancelEdit() {
  editText.value = "";
  isEditMode.value = false;
}

function submitEdit() {
  if (!editText.value) return;
  emit('edit', editText.value);
  cancelEdit();
}

</script>