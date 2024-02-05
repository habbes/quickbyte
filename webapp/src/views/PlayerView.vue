<template>
  <div v-if="media" class="flex flex-col fixed top-0 bottom-0 left-0 right-0 z-50 bg-[#261922]">
    <div class="h-[48px] border-b border-b-[#120c11] flex flex-row items-center justify-between px-5" :style="headerClasses">
      <div>
        <XMarkIcon class="h-5 w-5 hover:text-white hover:cursor-pointer" @click="closePlayer()" />
      </div>
      <UiLayout horizontal itemsCenter gapSm class="overflow-hidden">
        <div class="max-w-[200px] sm:max-w-max overflow-hidden text-ellipsis">
          <span :title="file?.name" class="text-white text-md overflow-hidden whitespace-nowrap">{{ file?.name }}</span>
        </div>
        <MediaPlayerVersionDropdown
          :media="media"
          :selectedVersionId="selectedVersionId"
          @versionUpload="handleVersionUpload()"
          @selectVersion="handleSelectVersion($event)"
        />
      </UiLayout>
      <a class="flex items-center gap-2 hover:text-white" download :href="media.file.downloadUrl">
        <div class="inline-block">
          <span class="hidden sm:inline">Download </span>
          <span class="whitespace-nowrap">{{ humanizeSize(media.file.size) }}</span>
        </div>
        <ArrowDownCircleIcon class="h-4 w-4 inline" />
      </a>
    </div>
    <div class=" flex flex-col-reverse sm:flex-row h-[calc(100dvh-48px)] relative">
      <!-- start comment sidebar -->
      <div class="w-full sm:w-96 border-r border-r-[#120c11] text-[#d1bfcd] text-xs flex flex-col">
        

        <div class="overflow-y-auto flex flex-col h-[calc(100dvh-478px)] sm:h-[calc(100dvh-248px)]" :style="commentsListStyles">
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
            <div class="text-xs whitespace-pre-line">
              {{ comment.text }}
            </div>
          </div>
        </div>

        <div class="px-5 py-5 border-t border-t-[#120c11] flex flex-col gap-2 sm:h-[200px]">
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
      <!-- end comment sidebar -->
      <!-- player container -->
      <div class="h-[250px] sm:h-full flex-1 sm:p-5 flex items-stretch justify-center bg-[#24141f]">
          <div class="h-full max-h-full sm:h-[90%] w-full flex sm:items-center">
            <MediaPlayer
              v-if="file && (mediaType === 'video' || mediaType === 'audio')"
              ref="videoPlayer"
              :mediaType="mediaType"
              :src="file.downloadUrl"
              @seeked="handleSeek()"
              :comments="timedComments"
              :selectedCommentId="selectedCommentId"
              @clickComment="handleVideoCommentClicked($event)"
              :fileName="file.name"
              :versionId="selectedVersionId"
              @playBackError="handleMediaPlayBackError($event)"
            />
            <ImageViewer
              v-else-if="file && mediaType === 'image'"
              :src="file.downloadUrl"
            />
            <div v-else class="w-full flex items-center justify-center">
              Preview unsupported for this file type.
            </div>
          </div>
      </div>
      <!-- end player container -->
    </div>
  </div>
  <div v-else-if="error" class="w-full flex justify-center items-center text-lg text-red-300">
    Error: {{ error.message }}
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, nextTick, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { apiClient, logger, showToast, store } from "@/app-utils";
import type { Media, MediaWithFileAndComments, CommentWithAuthor, TimedCommentWithAuthor } from "@quickbyte/common";
import { formatTimestampDuration, ensure, isDefined, humanizeSize } from "@/core";
import { ClockIcon, XMarkIcon, ArrowDownCircleIcon } from '@heroicons/vue/24/outline';
import { UiLayout } from '@/components/ui';
import MediaPlayer from '@/components/MediaPlayer.vue';
import ImageViewer from '@/components/ImageViewer.vue';
import MediaPlayerVersionDropdown from "@/components/MediaPlayerVersionDropdown.vue";
import { getMediaType } from "@/core/media-types";

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

const commentsListStyles = {} /* = {
  height: `calc(100dvh - ${headerSize + commentInputHeight}px)`
}; */


const videoPlayer = ref<typeof MediaPlayer>();
const route = useRoute();
const router = useRouter();
const error = ref<Error|undefined>();
const media = ref<MediaWithFileAndComments>();
const selectedVersionId = ref<string>();
const file = computed(() => {
  if (!media.value) return;
  if (!selectedVersionId.value) return;

  const version = ensure(media.value.versions.find(v => v._id === selectedVersionId.value),
    `Expected version '${selectedVersionId.value}'' to exist for media '${media.value._id}'.`);

  return version.file;
});
const comments = ref<CommentWithAuthor[]>([]);
const loading = ref(true);
const selectedCommentId = ref<string>();
const mediaType = computed(() => {
  if (!media.value) return 'unknown';
  return getMediaType(media.value.file.name);
});


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

const timedComments = computed<TimedCommentWithAuthor[]>(() => sortedComments.value.filter(c => isDefined(c.timestamp)) as TimedCommentWithAuthor[]);

watch([store.currentAccount],async () => {
  if (!store.currentAccount.value) return;
  const account = ensure(store.currentAccount.value);
  const queriedCommentId = Array.isArray(route.query.comment) ? route.query.comment[0] : route.query.comment;
  const queriedVersionId = Array.isArray(route.query.version) ? route.query.version[0] : route.query.version;

  try {
    media.value = await apiClient.getProjectMediumById(account._id, route.params.projectId as string, route.params.mediaId as string);
    selectedVersionId.value = queriedVersionId && media.value.versions.find(v => v._id === queriedVersionId) ? queriedVersionId : media.value.preferredVersionId;
    comments.value = media.value.comments;
    if (queriedCommentId) {
      const comment = comments.value.find(c => c._id === queriedCommentId);
      if (comment) {
        handleVideoCommentClicked(comment);
      }
    }
  }
  catch (e: any) {
    error.value = e;
    logger.error(e.message, e);
  }
  finally {
    loading.value = false;
  }
});

async function handleVersionUpload() {
  // TODO: since we don't have the file, for now just reload
  // the entire media object and update the local instance
  // this is unnecessarily costly, we just need to load
  // the downloadable file for the new preferred version
  // but wanted to get this done quickly by re-using existing
  // endpoints and maybe optmize later.
  try {
    const account = ensure(store.currentAccount.value);
    media.value = await apiClient.getProjectMediumById(account._id, route.params.projectId as string, route.params.mediaId as string);
    selectedVersionId.value = media.value.preferredVersionId;
  } catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e.message, e);
  }
};

async function handleSelectVersion(versionId: string) {
  selectedVersionId.value = versionId;
  router.push({ query: { ...route.query, version: versionId }});
}

function seekToComment(comment: CommentWithAuthor) {
  if (!videoPlayer.value) {
    // if the video ref isn't ready yet (e.g. component just mounted),
    // wait before we seek
    nextTick(() => seekToComment(comment));
    return;
  }

  if (comment.timestamp === null || comment.timestamp === undefined) {
    return;
  }

  videoPlayer.value.seek(comment.timestamp);
}

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

function selectComment(comment: CommentWithAuthor) {
  selectedCommentId.value = comment._id;
  router.push({ query: { ...route.query, comment: comment._id }});
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

function getHtmlCommentId(comment: CommentWithAuthor) {
  return `comment_${comment._id}`;
}

function handleCommentClicked(comment: CommentWithAuthor) {
  seekToComment(comment);
  selectComment(comment);
}

function handleVideoCommentClicked(comment: CommentWithAuthor) {
  seekToComment(comment);
  selectComment(comment);
  scrollToComment(comment);
}

async function sendComment() {
  if (!commentInputText.value) return;
  if (!media.value) return;
  const account = ensure(store.currentAccount.value);
  const projectId = ensure(route.params.projectId) as string;
  const mediaId = ensure(route.params.mediaId) as string;

  try {
    const comment = await apiClient.createMediaComment(
      account._id,
      projectId,
      mediaId,
      {
        text: commentInputText.value,
        mediaVersionId: selectedVersionId.value || media.value.preferredVersionId,
        timestamp: includeTimestamp.value ? currentTimeStamp.value : undefined
      }
    );
    commentInputText.value = '';
    comments.value.push(comment);
    
    
    scrollToComment(comment);
  }
  catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}

function handleMediaPlayBackError(error: Error) {
  showToast(`Error occurred while playing media: ${error.message}`, 'error');
  logger.error(`Error playing media, id: ${media.value?._id}, filename: ${media.value?.file.name}`);
}

</script>