<template>
  <div v-if="media" class="flex flex-col fixed top-0 bottom-0 left-0 right-0 z-50 bg-[#261922]">
    <div class="h-12 border-b border-b-[#120c11] flex flex-row items-center justify-between px-5" :style="headerClasses">
      <div>
        <XMarkIcon class="h-5 w-5 hover:text-white hover:cursor-pointer" @click="closePlayer()" />
      </div>
      <div class="text-white text-md">
        {{ media.name }}
      </div>
      <div></div>
    </div>
    <div class="flex-1 flex flex-row">
      <div class="w-96 border-r border-r-[#120c11] text-[#d1bfcd] text-xs flex flex-col">
        

        <div class="overflow-y-auto flex flex-col" :style="commentsListStyles">
          <div v-for="comment in sortedComments"
            :key="comment._id"
            :id="getHtmlCommentId(comment)"
            class="px-5 py-5 border-b border-b-[#120c11] last:border-b-0"
            :class="{ 'bg-[#120c11]': comment._id === selectedCommentId }"
          >
            <div class="flex flex-row items-center justify-between mb-2">
              <div class="flex flex-row items-center gap-2">
                <span class="text-sm text-white">{{ comment.author.name }}</span>
                <span :title="`Posted on ${new Date(comment._createdAt).toLocaleString()} `">{{ new Date(comment._createdAt).toLocaleDateString() }}</span>
              </div>
              <span
                v-if="comment.timestamp !== undefined"
                @click="handleCommentClicked(comment)"
                title="Jump to this time in the video"
                class="font-semibold text-blue-300 hover:cursor-pointer"
              >
                {{ formatTimestampDuration(comment.timestamp) }}
              </span>
            </div>
            <div class="text-xs">
              {{ comment.text }}
            </div>
          </div>
        </div>

        <div class="px-5 py-5 border-t border-t-[#120c11] flex flex-col gap-2" :style="commentInputStyles">
          <div class="flex-1 bg-[#604a59] rounded-md p-2 flex flex-col gap-2 ">
            <div class="flex flex-row items-center justify-end">
              <div class="flex flex-row items-center gap-1" title="Save comment at the current timestamp">
                <ClockIcon class="h-5 w-5"/>
                <span>{{ formatTimestampDuration(currentTimeStamp) }}</span>
                <input
                  v-model="includeTimestamp"
                  type="checkbox"
                  class="checkbox checkbox-xs checkbox-accent"
                >
              </div>
            </div>
            <textarea
              class="bg-[#604a59] border-0 hover:border-0 outline-none w-full flex-1 resize-none"
              placeholder="Type your comment here"
              @focus="handleCommentInputFocus()"
              v-model="commentInputText"
            ></textarea>
          </div>
          <div>
            <button class="btn btn-primary btn-xs" @click="sendComment()">Send</button>
          </div>
        </div>
        
      </div>
      <div class="flex-1 p-5 flex items-stretch justify-center bg-[#24141f]">
          <div class="h-[90%]">
            <VideoPlayer
              ref="videoPlayer"
              :src="media.file.downloadUrl"
              @seeked="handleSeek()"
              :comments="timedComments"
              :selectedCommentId="selectedCommentId"
              @clickComment="handleVideoCommentClicked($event)"
            />
          </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from "vue"
import { useRoute, useRouter } from "vue-router"
import { apiClient, logger, showToast, store } from "@/app-utils";
import { formatTimestampDuration, ensure, type MediaWithFile, type Comment, isDefined, type TimedComment } from "@/core";
import { ClockIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import VideoPlayer from "@/components/VideoPlayer.vue";

// had difficulties getting the scrollbar on the comments panel to work
// properly using overflow: auto css, so I resorted to hardcoding dimensions
const headerSize = 48;
const commentInputHeight = 200;
const headerClasses = {
  height: `${headerSize}px`
};
const commentInputStyles = {
  height: `${commentInputHeight}px`
};

const commentsListStyles = {
  height: `calc(100vh - ${headerSize + commentInputHeight}px)`
};


const videoPlayer = ref<typeof VideoPlayer>();
const route = useRoute();
const router = useRouter();
const error = ref<Error|undefined>();
const media = ref<MediaWithFile>();
const comments = ref<Comment[]>([]);
const loading = ref(true);
const selectedCommentId = ref<string>();


const currentTimeStamp = ref<number>(0);
const includeTimestamp = ref<boolean>(true);
const commentInputText = ref<string>();

// we display all the timestamped comments before
// all non-timestamped comments
// timestamped comments are display in chronological order
// based on timestamps
// then we display comments in chronological order
// based on creation date
const sortedComments = computed(() => {
  const temp = [...comments.value];
  temp.sort((a, b) => {
    if (isDefined(a.timestamp) && !isDefined(b.timestamp)) {
      return -1;
    }

    if (isDefined(b.timestamp) && !isDefined(a.timestamp)) {
      return 1;
    }

    const aDate = new Date(a._createdAt);
    const bDate = new Date(b._createdAt);
    const dateDiff =  aDate.getTime() - bDate.getTime();

    if (isDefined(a.timestamp) && isDefined(b.timestamp)) {
      const timestampDiff = a.timestamp! - b.timestamp!;
      return timestampDiff === 0 ? dateDiff : timestampDiff;
    }

    return dateDiff;
  });

  return temp;
});

const timedComments = computed<TimedComment[]>(() => sortedComments.value.filter(c => isDefined(c.timestamp)) as TimedComment[]);

onMounted(async () => {
  const user = ensure(store.userAccount.value);

  try {
    media.value = await apiClient.getProjectMediumById(user.account._id, route.params.projectId as string, route.params.mediaId as string);
    comments.value = media.value.comments;
  }
  catch (e: any) {
    error.value = e;
  }
  finally {
    loading.value = false;
  }
});

function seekToComment(comment: Comment) {
  if (!videoPlayer.value) return;
  if (comment.timestamp === null || comment.timestamp === undefined) {
    return;
  }

  videoPlayer.value.seek(comment.timestamp);
}

function scrollToComment(comment: Comment) {
  document.querySelector(`#${getHtmlCommentId(comment)}`)?.scrollIntoView(false);
}

function selectComment(comment: Comment) {
  selectedCommentId.value = comment._id;
}

function unselectComment() {
  selectedCommentId.value = undefined;
}

function handleSeek() {
  if (!videoPlayer.value) return;
  currentTimeStamp.value = videoPlayer.value.getCurrentTime();
}

function handleCommentInputFocus() {
  if (!videoPlayer.value) return;
  currentTimeStamp.value = videoPlayer.value.getCurrentTime();
  videoPlayer.value.pause();
  unselectComment();
}

function closePlayer() {
  router.push({ name: 'project-media', params: { projectId: route.params.projectId as string } })
}

function getHtmlCommentId(comment: Comment) {
  return `comment_${comment._id}`;
}

function handleCommentClicked(comment: Comment) {
  seekToComment(comment);
  selectComment(comment);
}

function handleVideoCommentClicked(comment: TimedComment) {
  seekToComment(comment);
  selectComment(comment);
  scrollToComment(comment);
}

async function sendComment() {
  if (!commentInputText.value) return;
  if (!media.value) return;
  const user = ensure(store.userAccount.value);
  const projectId = ensure(route.params.projectId) as string;
  const mediaId = ensure(route.params.mediaId) as string;

  try {
    const comment = await apiClient.createMediaComment(
      user.account._id,
      projectId,
      mediaId,
      {
        text: commentInputText.value,
        mediaVersionId: media.value?.preferredVersionId,
        timestamp: includeTimestamp.value ? currentTimeStamp.value : undefined
      }
    );
    commentInputText.value = '';
    comments.value.push(comment);
    
    // we wait for the next tick to ensure the new comment has been added to the DOM
    // before we scroll into it
    nextTick(() => scrollToComment(comment));
  }
  catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}

</script>