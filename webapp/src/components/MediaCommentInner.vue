<template>
  <div
      :id="htmlId"
      class="px-5 py-5 border-b border-b-[#120c11]"
      :class="{ 'bg-[#120c11]': selected }"
    >
      <div :style="{ 'padding-left': `${nestingPadding}px` }">
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
        <div class="mt-3 mb-2 flex justify-between">
          <span
            @click="startReply()"
            class="font-bold text-gray-500 hover:text-gray-200 cursor-pointer"
          >
            Reply
          </span>
          <div>
            <span v-if="deletable" title="Delete comment">
              <TrashIcon
                @click="$emit('delete', comment)"
                class="w-4 h-4 cursor-pointer text-gray-500 hover:text-gray-200"
              />
            </span>
          </div>
        </div>
      </div>
      <div v-if="isReplyMode">
        <UiExpandableTextInput v-model="replyText" ref="replyInput" dark fullWidth />
      </div>
      <div v-if="isReplyMode" class="flex justify-end gap-4 mt-2">
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
    </div>
</template>
<script lang="ts" setup>
import { ref, computed, nextTick } from "vue";
import type { CommentWithAuthor } from "@quickbyte/common";
import { formatTimestampDuration} from "@/core";
import { UiExpandableTextInput } from "@/components/ui";
import { TrashIcon } from "@heroicons/vue/24/solid";

const props = defineProps<{
  comment: CommentWithAuthor;
  htmlId: string;
  selected?: boolean;
  // nesting level. 0 is for top-level comments,
  // 1 for first-level of children, etc.
  nestingLevel: number;
  deletable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click', comment: CommentWithAuthor): void;
  (e: 'reply', text: string): void;
  (e: 'delete', comment: CommentWithAuthor): void;
}>();

const isReplyMode = ref(false);
const replyInput = ref<typeof UiExpandableTextInput>();
const replyText = ref<string>("");
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

</script>