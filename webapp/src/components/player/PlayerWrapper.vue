<template>
  <div v-if="media" class="flex flex-col fixed top-0 bottom-0 left-0 right-0 z-50 bg-[#261922]">
    <div class="h-[48px] border-b border-b-[#120c11] flex flex-row items-center justify-between px-5"
      :style="headerClasses">
      <div>
        <XMarkIcon class="h-5 w-5 hover:text-white hover:cursor-pointer" @click="closePlayer()" />
      </div>
      <UiLayout horizontal itemsCenter gapSm class="overflow-hidden">
        <VersionTitle :versions="media.versions" :selectedVersionId="selectedVersionId" />
        <MediaPlayerVersionDropdown v-if="showAllVersions" :media="media" :selectedVersionId="selectedVersionId"
          :allowUpload="allowUploadVersion" :allowManagement="allowVersionManagement"
          @versionUpload="handleVersionUpload()" @update="handleMediaUpdate($event)"
          @selectVersion="handleSelectVersion($event)" @compareVersions="handleCompareVersions" />
      </UiLayout>
      <div>
        <a v-if="allowDownload && selectedVersion" class="flex items-center gap-2 hover:text-white" download
          :href="selectedVersion.file.downloadUrl">
          <div class="inline-block">
            <span class="hidden sm:inline">Download </span>
            <span class="whitespace-nowrap">{{ humanizeSize(selectedVersion.file.size) }}</span>
          </div>
          <ArrowDownCircleIcon class="h-4 w-4 inline" />
        </a>
      </div>
    </div>
    <div class="flex flex-col-reverse sm:flex-row h-[calc(100dvh-48px)] relative">

      <!-- start sidebar -->
      <div class="w-full sm:w-96 border-r border-r-[#120c11] text-[#d1bfcd] text-xs flex flex-col">
        <!-- start sidebar header -->
        <div class="flex items-stretch h-[30px] border-b border-b-black">
          <div @click="sideBarState = 'comments'" v-if="allowComments"
            class="flex-1 flex items-center gap-2 px-4 cursor-pointer" :class="{
              'text-white': sideBarState === 'comments',
              'border-b border-b-blue-300': sideBarState === 'comments'
            }">
            <ChatBubbleLeftRightIcon class="h-4 w-4" />
            Comments
          </div>
          <div @click="sideBarState = 'files'" class="flex-1 flex items-center gap-2 px-4 cursor-pointer" :class="{
            'text-white': sideBarState === 'files',
            'border-b border-b-blue-300': sideBarState === 'files'
          }">
            <ListBulletIcon class="h-4 w-4" />
            Browse files
          </div>
        </div>
        <!-- end sidebar header -->

        <!-- start comment section -->
        <div v-if="sideBarState === 'comments'">
          <div class="commentsList overflow-y-auto flex flex-col sm:h-[calc(100dvh-278px)]">
            <MediaComment v-if="user" v-for="comment in sortedComments" :key="comment._id" :comment="comment"
              :htmlId="getHtmlCommentId(comment)" :getHtmlId="getHtmlCommentId"
              :selectedId="selectedCommentId"
              :currentUserId="user._id"
              :currentRole="role"
              @click="handleCommentClicked($event)"
              @reply="sendCommentReply"
              @delete="showDeleteCommentDialog($event)"
              @edit="editComment" />
          </div>

          <div class="px-5 py-5 border-t border-t-[#120c11] flex flex-col gap-2 h-[150px] sm:h-[200px]">
            <div class="flex-1 bg-[#604a59] rounded-md p-2 flex flex-col gap-2 ">

              <div class="flex flex-row items-center justify-between">
                <div class="flex flex-1">
                  <DrawingTools v-if="(includeTimestamp && mediaType === 'video') || mediaType === 'image'"
                    v-model:active="drawingToolsActive" @selectTool="annotationsDrawingTool = $event"
                    @undo="canvasController.undoShape()" @redo="canvasController.redoShape()"
                    @update:active="$event && handleCommentInputFocus()" />
                </div>
                <div v-if="(mediaType === 'video' || mediaType === 'audio') && !drawingToolsActive"
                  class="flex flex-row items-center gap-1" title="Save comment at the current timestamp">
                  <ClockIcon class="h-5 w-5" />
                  <span>{{ formatTimestampDuration(currentTimeStamp) }}</span>
                  <input v-model="includeTimestamp" type="checkbox" class="checkbox checkbox-xs checkbox-accent">
                </div>
              </div>
              <!--
                Stop propagation of keyboard events when the comment box is in focus
                to avoid triggering the global spacebar watcher and accidentally
                playing the video.
              -->
              <textarea class="bg-[#604a59] border-0 hover:border-0 outline-none w-full flex-1 resize-none"
                placeholder="Type your comment here" @focus="handleCommentInputFocus()" @keyup.stop="" @keydown.stop=""
                v-model="commentInputText">
              </textarea>
            </div>
            <div class="flex gap-2 items-center">
              <button class="btn btn-primary btn-xs" @click="sendTopLevelComment()">Send</button>
            </div>
          </div>
        </div>
        <!-- end comment section -->
        <!-- file list section -->
        <div v-if="sideBarState === 'files'" class="filesList overflow-y-auto sm:h-[calc(100dvh-78px)]">
          <InPlayerMediaBrowser :items="otherItems" :getMediaType="getBrowserItemMediaType"
            :getThumbnail="getBrowserItemThumbnail" :hasParentFolder="browserHasParentFolder" :selectedItemId="media._id"
            @itemClick="$emit('browserItemClick', $event)" @goToParent="$emit('browserToParentFolder')" />
        </div>
        <!-- end file list section -->

      </div>
      <!-- end sidebar -->
      <!-- player container -->
      <div class="sm:h-full flex-1 sm:px-5 sm:items-center flex items-stretch justify-center">
        <div class="h-full max-h-full w-full flex sm:items-center">
          <AVPlayer :style="`height: ${playerHeight}px`"
            v-if="media.file && (mediaType === 'video' || mediaType === 'audio')" ref="avPlayer" :mediaType="mediaType"
            :sources="sources" @seeked="handleSeek()" :comments="timedComments" :selectedCommentId="selectedCommentId"
            @clickComment="handleVideoCommentClicked($event)" :versionId="selectedVersionId"
            @playBackError="handleMediaPlayBackError($event)" @heightChange="playerHeight = $event"
            :annotationsDrawingTool="includeTimestamp ? annotationsDrawingTool : undefined"
            @drawAnnotations="currentAnnotations = $event" />
          <ImageViewer v-else-if="file && mediaType === 'image'" :src="file.downloadUrl" class="h-[300px] sm:h-full"
            :comments="sortedComments" :selectedCommentId="selectedCommentId"
            :annotationsDrawingTool="annotationsDrawingTool" @drawAnnotations="currentAnnotations = $event" />
          <div v-else class="h-[300px] sm:h-auto w-full flex items-center justify-center">
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
  <DeleteCommentDialog ref="deleteCommentDialog" v-if="media && deleteComment" :deleteComment="deleteComment"
    @deleted="handleCommentDeleted($event)" />
</template>
<script setup lang="ts">
import { computed, onMounted, ref, nextTick, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { logger, showToast } from "@/app-utils";
import type {
  RoleType,
  MediaWithFileAndComments,
  Comment,
  CommentWithAuthor,
  TimedCommentWithAuthor,
  WithChildren,
  MediaType,
  ProjectItem,
  Media,
  FrameAnnotationCollection,
WithParent
} from "@quickbyte/common";
import { isPlayableMediaType } from "@quickbyte/common";
import { formatTimestampDuration, ensure, isDefined, humanizeSize } from "@/core";
import { ClockIcon, XMarkIcon, ArrowDownCircleIcon, ChatBubbleLeftRightIcon, ListBulletIcon } from '@heroicons/vue/24/outline';
import { UiLayout } from '@/components/ui';
import AVPlayer from './AVPlayer.vue';
import ImageViewer from './ImageViewer.vue';
import MediaPlayerVersionDropdown from "./MediaPlayerVersionDropdown.vue";
import MediaComment from "./MediaComment.vue";
import InPlayerMediaBrowser from './InPlayerMediaBrowser.vue';
import VersionTitle from './VersionTitle.vue';
import { getMediaType, getMimeTypeFromFilename } from "@/core/media-types";
import DeleteCommentDialog from "@/components/DeleteCommentDialog.vue";
import { DrawingTools, type DrawingToolConfig, provideCanvasController } from "@/components/canvas";
import { findTopLevelOrChildCommentById } from "./comment-helpers.js";

type MediaSource = {
  url: string;
  mimeType?: string;
  type: 'hls' | 'dash' | 'raw'
};

type SideBarState = 'comments' | 'files';

const props = defineProps<{
  media: MediaWithFileAndComments;
  otherItems: ProjectItem[];
  role: RoleType;
  allowComments: boolean;
  allowDownload: boolean;
  showAllVersions: boolean;
  allowUploadVersion: boolean;
  allowVersionManagement?: boolean;
  selectedVersionId: string;
  selectedCommentId?: string;
  user?: {
    _id: string;
    name: string;
  },
  browserHasParentFolder: boolean;
  sendComment?: (args: {
    text?: string;
    versionId: string;
    timestamp?: number;
    parentId?: string;
    annotations?: FrameAnnotationCollection;
  }) => Promise<WithChildren<CommentWithAuthor>>;
  editComment?: (args: {
    commentId: string;
    text: string;
  }) => Promise<Comment>;
  deleteComment?: (args: {
    commentId: string;
    parentId?: string;
  }) => Promise<unknown>;
}>();

const emit = defineEmits<{
  (e: 'close'): unknown;
  (e: 'selectVersion', versionId: string): unknown;
  (e: 'newVersionUpload'): unknown;
  (e: 'updateMedia', updatedMedia: Media): unknown;
  (e: 'browserItemClick', item: ProjectItem): unknown;
  (e: 'browserToParentFolder'): unknown;
  (e: 'compareVersions', v1Id: string, v2Id: string): unknown;
}>();

// had difficulties getting the scrollbar on the comments panel to work
// properly using overflow: auto css, so I resorted to hardcoding dimensions
const headerSize = 48;
const headerClasses = {
  height: `${headerSize}px`
};

const avPlayer = ref<typeof AVPlayer>();
const route = useRoute();
const router = useRouter();
const error = ref<Error | undefined>();
const drawingToolsActive = ref(false);
const annotationsDrawingTool = ref<DrawingToolConfig>();
const currentAnnotations = ref<FrameAnnotationCollection>();
const canvasController = provideCanvasController();

watch(drawingToolsActive, () => {
  // clear drawn annotations when drawing tools deactivated
  if (!drawingToolsActive.value) {
    currentAnnotations.value = undefined;
  }
});

const comments = ref<WithChildren<CommentWithAuthor>[]>([...props.media.comments]);
const selectedCommentId = ref<string>();
const mediaType = computed(() => {
  if (!props.media) return 'unknown';
  return getMediaType(props.media.file.name);
});


const currentTimeStamp = ref<number>(0);
const includeTimestamp = ref<boolean>(true);
const commentInputText = ref<string>();
const deleteCommentDialog = ref<typeof DeleteCommentDialog>();
const user = ref<{ _id: string, name: string } | undefined>(props.user);

const sideBarState = ref<SideBarState>(props.allowComments ? 'comments' : 'files');
const playerHeight = ref<number>();
const commentBoxSmallScreenHeight = 150;
const headerHeight = 48;
const sidebarHeaderHeight = 30;
const imageViewerSmallScreenHeight = 300;

const commentsListCssHeightSmallScreen = computed(() => {
  const viewerHeight = playerHeight.value && (mediaType.value === 'video' || mediaType.value === 'audio') ?
    playerHeight.value :
    imageViewerSmallScreenHeight;

  const offset = viewerHeight
    + commentBoxSmallScreenHeight
    + headerHeight
    + sidebarHeaderHeight;

  return `calc(100dvh - ${offset}px)`
});

const filesListHeightSmallScreen = computed(() => {
  const viewerHeight = playerHeight.value && (mediaType.value === 'video' || mediaType.value === 'audio') ?
    playerHeight.value :
    imageViewerSmallScreenHeight;


  const offset = viewerHeight
    + headerHeight
    + sidebarHeaderHeight;

  return `calc(100dvh - ${offset}px)`;
});

// Helps keep track of when the media has changed
const _media = computed(() => props.media);
watch(_media, () => {
  comments.value = [...props.media.comments];
  if (props.selectedCommentId) {
    const comment = findTopLevelOrChildCommentById(comments.value, props.selectedCommentId);
    if (comment) {
      handleVideoCommentClicked(comment);
    }
  }

  // selectedVersionId.value = props.selectedVersionId || _media.value.preferredVersionId;
}, { immediate: true });


const selectedVersion = computed(() => {
  if (!props.media) return;
  if (!props.selectedVersionId) return;

  const version = ensure(props.media.versions.find(v => v._id === props.selectedVersionId),
    `Expected version '${props.selectedVersionId}'' to exist for media '${props.media._id}'.`);

  return version;
});

const file = computed(() => {
  if (!selectedVersion.value) {
    return;
  }

  return selectedVersion.value.file;
});


const sources = computed<MediaSource[]>(() => {
  if (!props.media) return [];
  if (!file.value) return [];

  const _src = [] as MediaSource[];
  if (file.value.hlsManifestUrl) {
    _src.push({
      url: file.value.hlsManifestUrl,
      type: 'hls'
    });
  }
  if (file.value.dashManifestUrl) {
    _src.push({
      url: file.value.dashManifestUrl,
      type: 'dash'
    });
  }
  if (file.value.downloadUrl) {
    _src.push({
      url: file.value.downloadUrl,
      mimeType: getMimeTypeFromFilename(file.value.name),
      type: 'raw'
    });
  }

  return _src;
});
const isMediaOptimized = computed(() =>
  mediaType.value === 'video' || mediaType.value === 'audio' ?
    sources.value.some(s => s.type === 'hls' || s.type === 'dash')
    : true
);

watch([isMediaOptimized, file], () => {
  if (!file.value) return;
  if (!file.value?.playbackPackagingStatus) {
    // If packaging status is not available, this file has not yet
    // been scheduled for encoding. Offer user option to encode
    if (isMediaOptimized.value === false) {
      showToast('This media is not optimized or upload did not complete. Playback experience may be degraded.', 'info')
    }
  }
  else if (file.value.playbackPackagingStatus === 'error') {
    logger.warn(`User attempting to play file with failed encoding file id: '${file.value._id}', filename '${file.value.name}'`);
    showToast('Media encoding failed for this file. Playback experience may be degraded.', 'info');
  }
  else if (file.value.playbackPackagingStatus !== 'success') {
    // Encoding in progress.
    showToast('This media is being optimized for playback. Playback experience may be suboptimal until the process is complete.', 'info');
  }
});

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
    const dateDiff = aDate.getTime() - bDate.getTime();

    if (isDefined(a.timestamp) && isDefined(b.timestamp)) {
      const timestampDiff = a.timestamp! - b.timestamp!;
      return timestampDiff === 0 ? dateDiff : timestampDiff;
    }

    return dateDiff;
  });

  return temp;
});

const timedComments = computed<WithChildren<TimedCommentWithAuthor>[]>(() =>
  sortedComments.value.filter(c => isDefined(c.timestamp)) as WithChildren<TimedCommentWithAuthor>[]);

function handleVersionUpload() {
  // TODO: we currently don't pass the file or version that was
  // uploaded (refactoring maybe needed)
  // As a workaround, parent of this component is expected to reload the media
  // and update the selectedVersionId prop when this event occurrs.
  emit('newVersionUpload');
};

function handleMediaUpdate(updatedMedia: Media) {
  emit('updateMedia', updatedMedia)
}

function handleSelectVersion(versionId: string) {
  emit('selectVersion', versionId);
}

function handleCompareVersions(v1Id: string, v2Id: string) {
  emit('compareVersions', v1Id, v2Id);
}


function seekToComment(comment: WithParent<Comment>) {
  if (mediaType.value !== 'video' && mediaType.value !== 'audio') {
    return;
  }

  if (!avPlayer.value) {
    // if the video ref isn't ready yet (e.g. component just mounted),
    // wait before we seek
    // TODO: warn, if video player is never ready, this will lead to infinite async recursion
    // and cause the page to hang. Is the player guaranteed to be available?
    nextTick(() => seekToComment(comment));
    return;
  }

  if (!isDefined(comment.timestamp)) {
    // if it's a child comment, seek to parent
    if (comment.parent) {
      seekToComment(comment.parent);
    }
  
    return;
  }

  avPlayer.value.seek(comment.timestamp!);
}

function scrollToComment(comment: Comment) {
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

function selectComment(comment: Comment) {
  selectedCommentId.value = comment._id;
  router.push({ query: { ...route.query, comment: comment._id } });
}

function unselectComment() {
  selectedCommentId.value = undefined;
}

function handleSeek() {
  if (!avPlayer.value) return;
  currentTimeStamp.value = avPlayer.value.getCurrentTime();
}

function handleCommentInputFocus() {
  if (!avPlayer.value) return;
  currentTimeStamp.value = avPlayer.value.getCurrentTime();
  avPlayer.value.pause();
  unselectComment();
}

function closePlayer() {
  emit('close');
}

function getHtmlCommentId(comment: Comment) {
  return `comment_${comment._id}`;
}

function handleCommentClicked(comment: Comment) {
  seekToComment(comment);
  if (selectedCommentId.value === comment._id) {
    unselectComment();
  }
  else {
    selectComment(comment);
  }
}

function handleVideoCommentClicked(comment: Comment) {
  seekToComment(comment);
  selectComment(comment);
  scrollToComment(comment);
}

async function sendTopLevelComment() {
  // Comment should have either text or annotations or both.
  // Annotations are only allowed for video (if timestamp is included) or images
  if (
    !commentInputText.value
    && !(currentAnnotations.value && currentAnnotations.value.annotations.length && includeTimestamp.value && mediaType.value === 'video')
    && !(currentAnnotations.value && currentAnnotations.value.annotations.length && mediaType.value === 'image')
  ) {
    return;
  }

  if (!props.media) return;
  if (!props.sendComment) throw new Error('sendComment func not set in props');

  try {
    const comment = await props.sendComment({
      text: commentInputText.value,
      timestamp: includeTimestamp.value && isPlayableMediaType(mediaType.value)? currentTimeStamp.value : undefined,
      versionId: props.selectedVersionId || props.media.preferredVersionId,
      annotations: currentAnnotations.value
    });

    if (!user.value) {
      user.value = comment.author
    };

    commentInputText.value = '';
    currentAnnotations.value = undefined;
    annotationsDrawingTool.value = undefined;
    drawingToolsActive.value = false;
    const commentIndex = comments.value.findIndex(c => c._id === comment._id);
    // Since the media comments maybe updated by the implementation of
    // props.sendComment, check first before adding the created comment to the list.
    // Ideally, we should refactor things such that the comments props are
    // updated by the caller whenever the a comment is added
    if (commentIndex === -1) {
      comments.value.push(comment);
    }

    scrollToComment(comment);
  }
  catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}

async function sendCommentReply(text: string, parentId: string) {
  if (!props.sendComment) throw new Error(`props.sendComment required`);

  try {
    // Note: we don't support timestamps for replies
    const comment = await props.sendComment({
      text,
      parentId,
      versionId: props.selectedVersionId || props.media.preferredVersionId
    });

    if (!user.value) {
      user.value = comment.author
    };

    const parentIndex = comments.value.findIndex(c => c._id === parentId);
    if (parentIndex !== -1) {
      const parent = comments.value[parentIndex];
      const childIndex = parent.children.findIndex(c => c._id === comment._id);
      // TODO: we push the comment here for backwards compatibility
      // The parent component should be responsible of updating the local
      // comments collection when a comment is sent. Once we've updated
      // scenarios that use this component, remove this code
      if (childIndex === -1) {
        const children = parent.children.concat([comment]);
        comments.value[parentIndex] = { ...parent, children }
      }
    }

    scrollToComment(comment);
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}

async function editComment(commentId: string, text: string) {
  if (!props.editComment) throw new Error('props.editComment required for this operation');

  try {
    const comment = await props.editComment({
      commentId,
      text
    });

    // TODO: we're performing this update for backwards compatibility
    // but the parent component should be responsible for updating
    // the comments collection. Once we refactor all scenarios
    // that use this component, we should remove this local update code.
    if (comment.parentId) {
      const parentIndex = comments.value.findIndex(c => c._id === comment.parentId);
      if (parentIndex === -1) {
        logger.warn(`Expected to find parent '${comment.parentId}' of comment '${comment._id}' after comment update, but did not find it.`);
        return;
      }

      const parent = comments.value[parentIndex];

      const indexToUpdate = parent.children.findIndex(c => c._id === comment._id);
      if (indexToUpdate === -1) {
        logger.warn(`Expected to find comment '${comment._id}' as child of '${parent._id}' in comments list after update, but did not find it.`);
        return;
      }

      // the comment we get from the server has less fields than the one we have in the client, so we merge
      // the two instead of a full replacement
      const children = [...parent.children];
      children[indexToUpdate] = { ...children[indexToUpdate], ...comment };
      comments.value[parentIndex] = { ...parent, children };
      return;
    }

    const indexToUpdate = comments.value.findIndex(c => c._id === comment._id);
    if (indexToUpdate === -1) {
      return;
    }

    comments.value[indexToUpdate] = { ...comments.value[indexToUpdate], ...comment };
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}

function showDeleteCommentDialog(comment: CommentWithAuthor) {
  deleteCommentDialog.value?.open(comment);
}

function handleCommentDeleted(comment: CommentWithAuthor) {
  if (comment.parentId) {
    const parent = comments.value.find(c => c._id === comment.parentId);

    if (!parent) {
      return;
    }

    // TODO: we're performing this update for backwards compatibility
    // but the parent component should be responsible for updating
    // the comments collection. Once we refactor all scenarios
    // that use this component, we should remove this local update code.

    // NOTE: we only assume two-levels of nesting
    const indexToRemove = parent.children.findIndex(c => c._id === comment._id);
    if (indexToRemove === -1) {
      return;
    }

    parent.children.splice(indexToRemove, 1);
    return;
  }

  // top-level comment
  const indexToRemove = comments.value.findIndex(c => c._id === comment._id);
  if (indexToRemove === -1) {
    return;
  }

  comments.value.splice(indexToRemove, 1);
}

function handleMediaPlayBackError(error: Error) {
  showToast(`Error occurred while playing media: ${error.message}`, 'error');
  logger.error(`Error playing media, id: ${props.media?._id}, filename: ${props.media?.file.name}`, error);
}

function getBrowserItemMediaType(item: ProjectItem): MediaType | 'folder' {
  if (item.type === 'folder') {
    return 'folder';
  }

  return getMediaType(item.item.name);
}

function getBrowserItemThumbnail(item: ProjectItem): string | undefined {
  if (item.type === 'folder') {
    return;
  }

  return item.item.thumbnailUrl;
}

</script>
<style scoped>
@media (max-width: 640px) {
  .commentsList {
    height: v-bind('commentsListCssHeightSmallScreen');
  }

  .filesList {
    height: v-bind('filesListHeightSmallScreen');
  }
}
</style>