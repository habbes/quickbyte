<template>
  <div class="flex flex-col fixed top-0 bottom-0 left-0 right-0 z-50 bg-[#261922]">
    <!-- header -->
    <VersionComparerHeader
      @close="closeComparison()"
      :title="media.name"
      :allowSidebarToggle="allowComments"
      v-model:showSidebar="showSidebar"
    />
    <!-- end header -->
     <!-- main container -->
    <div class="flex flex-col-reverse sm:flex-row h-[calc(100dvh-48px)] relative">
      <!-- start sidebar -->
      <!-- TODO: sidebar is hidden on small screens until we figure out how a practical layout -->
      <SidebarContainer class=" hidden sm:flex" v-if="showSidebar && allowComments">
         <!-- start sidebar header -->
        <div class="flex items-stretch h-[30px] border-b border-b-black">
          <div
            @click="sideBarState = 'comments'"
            v-if="allowComments"
            class="flex-1 flex items-center gap-2 px-4 cursor-pointer"
            :class="{
              'text-white': sideBarState === 'comments',
              'border-b border-b-blue-300': sideBarState === 'comments'
            }"
          >
            <ChatBubbleLeftRightIcon class="h-4 w-4" />
            Comments
          </div>
          <div
            @click="sideBarState = 'files'"
            class="flex-1 flex items-center gap-2 px-4 cursor-pointer"
            :class="{
              'text-white': sideBarState === 'files',
              'border-b border-b-blue-300': sideBarState === 'files'
            }"
          >
            <ListBulletIcon class="h-4 w-4" />
            Browse files
          </div>
        </div>
        <!-- end sidebar header -->

        <!-- start comment section -->
        <CommentsPanel v-if="sideBarState === 'comments'"
          ref="commentsPanel"
          :comments="sortedComments"
          :currentTimestamp="currentPlayTime"
          :canvasController="canvasController"
          :role="role"
          :user="user"
          :mediaType="mediaType"
          :smallScreenHeight="commentsListCssHeightSmallScreen"
          v-model:input="commentInputText"
          v-model:selectedCommentId="selectedCommentId"
          @clickComment="handleCommentClicked($event)"
          @sendTopLevelComment="handleSendTopLevelComment($event)"
          @commentInputFocus="handleCommentInputFocus()"
        />
        <!-- end comment section -->
        <!-- file list section -->
        <div
          v-if="sideBarState === 'files'"
          class="filesList overflow-y-auto sm:h-[calc(100dvh-78px)]"
        >
          <!-- <InPlayerMediaBrowser
            :items="otherItems"
            :getMediaType="getBrowserItemMediaType"
            :getThumbnail="getBrowserItemThumbnail"
            :hasParentFolder="browserHasParentFolder"
            :selectedItemId="media._id"
            @itemClick="$emit('browserItemClick', $event)"
            @goToParent="$emit('browserToParentFolder')"
          /> -->
        </div>
        <!-- end file list section -->
        
      </SidebarContainer>
      <!-- end sidebar -->
      <!-- players container -->
      <div class="flex-1">
        <!-- side-by-side container -->
        <div class="flex flex-col sm:flex-row h-[calc(100dvh-108px)] relative overflow-y-auto">
          <VersionPlayer
            ref="player1"
            :media="media"
            :versionId="version1Id"
            :selected="firstSelected"
            :volume="firstVolume"
            :allowDownload="allowDownload"
            :playTime="player1State?.currentTime"
            :duration="player1State?.duration"
            :comments="version1Comments"
            :selectedCommentId="selectedCommentId"
            @changeVersion="setVersion1($event)"
            @select="firstSelected = true"
            @playerStateChange="player1State = $event"
            @clickComment="handleCommentClicked($event)"

          />
          <VersionPlayer
            ref="player2"
            :media="media"
            :versionId="version2Id"
            :selected="!firstSelected"
            :volume="secondVolume"
            :allowDownload="allowDownload"
            :playTime="player2State?.currentTime"
            :duration="player2State?.duration"
            :comments="version2Comments"
            :selectedCommentId="selectedCommentId"
            @changeVersion="setVersion2($event)"
            @select="firstSelected = false"
            @playerStateChange="player2State = $event"
            @clickComment="handleCommentClicked($event)"
          />
        </div>
        <!-- end side-by-side container -->
        <div v-if="mediaType === 'video' || mediaType === 'audio'">
          <PlaybackControls
            style="height: 60px"
            :playTime="currentPlayTime"
            :duration="duration"
            :isMuted="false"
            :isPlaying="isPlaying"
            :allowFullScreen="false"
            v-model:volume="volume"
            @play="play()"
            @pause="pause()"
            @seek="seekTo($event)"
          />
        </div>
      </div>
      <!-- end players container -->
    </div>
    <!-- end main container -->
  </div>
</template>
<script lang="ts" setup>
import { ref, computed, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { getMediaType } from "@quickbyte/common";
import type { MediaWithFileAndComments, MediaType, RoleType, WithChildren, CommentWithAuthor } from "@quickbyte/common";
import { logger } from "@/app-utils";
import VersionComparerHeader from './VersionComparerHeader.vue';
import VersionPlayer from './VersionPlayer.vue';
import PlaybackControls from "./PlaybackControls.vue";
import { SidebarContainer, CommentsPanel, useCommentOperationsHelpers } from "@/components/player";
import type { AVPlayerState, SendCommentHandler} from "@/components/player";
import { ListBulletIcon, ChatBubbleLeftRightIcon } from "@heroicons/vue/24/outline";

type SideBarState = 'comments'|'files';

const props = defineProps<{
  media: MediaWithFileAndComments,
  version1Id: string;
  version2Id: string;
  allowDownload: boolean;
  allowComments: boolean;
  selectedCommentId?: string;
  user?: {
    _id: string;
    name: string;
  },
  role: RoleType;
  sendComment: SendCommentHandler
}>()

const emit = defineEmits<{
  (e: 'close'): unknown;
  (e: 'changeVersions', version1Id: string, version2Id: string): unknown;
}>();

const router = useRouter();
const route = useRoute();
const showSidebar = ref(true);
const mediaType = computed<MediaType>(() => {
  const files = [props.version1Id, props.version2Id].flatMap(vId =>
    props.media.versions.filter(v => v._id === vId).map(v => v.file))

  // Ideally all versions of the same media should be the same type.
  // But nothing stops the users from having different media types.
  // If at least one of the versions is a video, let's consider
  // this a video, otherwise if one's audio, let's consider it audio, etc.
  return files.find(f =>  getMediaType(f.name) === 'video') ? 'video'
    : files.find(f => getMediaType(f.name) === 'audio') ? 'audio'
    : files.find(f => getMediaType(f.name) === 'image') ? 'image'
    : 'unknown';
});

const commentsPanel = ref<typeof CommentsPanel>();
const sideBarState = ref<SideBarState>(props.allowComments ? 'comments' : 'files');

const _media = computed(() => props.media);
const {
  comments,
  sortedComments,
  canvasController,
  commentInputText,
  sendTopLevelComment: sendTopLevelCommentCore
} = useCommentOperationsHelpers({
  media: _media,
  mediaType: mediaType,
  seekToComment: seekToComment,
  scrollToComment: scrollToComment,
  sendComment: props.sendComment
});

const selectedCommentId = ref<string>();
const firstSelected = ref(true);
const selectedVersionId = computed(() => firstSelected.value ? props.version1Id : props.version2Id);
const player1 = ref<typeof VersionPlayer>();
const player2 = ref<typeof VersionPlayer>();
const players = [player1, player2];
const selectedPlayer = computed(() => firstSelected.value ? player1.value : player2.value);
const player1State = ref<AVPlayerState>();
const player2State = ref<AVPlayerState>();
const volume = ref(0.5);
const firstVolume = computed(() => firstSelected.value ? volume.value : 0);
const secondVolume = computed(() => firstSelected.value ? 0 : volume.value);
const version1Comments = computed(() => comments.value.filter(c => c.mediaVersionId === props.version1Id));
const version2Comments = computed(() => comments.value.filter(c => c.mediaVersionId === props.version2Id));

// the duration is the larger of the two versions
const duration = computed(() =>
  Math.max(
    player1State.value?.duration || 0,
    player2State.value?.duration || 0
  ));

// Ideally both player's time should be synchronized.
// But they could go out of sync due to many reasons.
// We use the largest as the overall "current" time
// since it's more likely that the longer media will
// continue to play alone
const currentPlayTime = computed(() =>
  Math.max(
    player1State.value?.currentTime || 0,
    player2State.value?.currentTime || 0
  ));

const isPlaying = computed(() =>
  player1State.value?.isPlaying || player2State.value?.isPlaying || false);

const commentsListCssHeightSmallScreen = computed(() => {
  logger?.warn('TODO: Comment list small screen height not implemented.');
  
  return `100px`;
});

// Helps keep track of when the media has changed
watch(() => props.media, () => {
  comments.value = [...props.media.comments];
  if (props.selectedCommentId) {
    const comment = comments.value.find(c => c._id === props.selectedCommentId);
    if (comment) {
      handleCommentClicked(comment);
    }
  }

  // selectedVersionId.value = props.selectedVersionId || _media.value.preferredVersionId;
}, { immediate: true });

// synchronize playing state
watch([() => player1State.value?.isPlaying, () => player2State.value?.isPlaying], 
  ([player1IsCurrentlyPlaying, player2IsCurrentlyPlaying],
    [player1WasPreviouslyPlaying, player2WasPreviouslyPlaying]) => {
  if (!player1State.value || !player2State.value) {
    return;
  }

  // if one player has paused playing before reaching the end, pause the other
  // player as well
  if (
    (player1WasPreviouslyPlaying && !player1IsCurrentlyPlaying && player1State.value.currentTime < player1State.value.duration)
  ) {
    player2.value?.pause();
  }

  if (player2WasPreviouslyPlaying && !player2IsCurrentlyPlaying && player2State.value.currentTime < player2State.value.duration) {
    player1.value?.pause();
  }

  // if one player has transition from pause to playing, then resume the other player as well
  if (!player1WasPreviouslyPlaying && player1IsCurrentlyPlaying && !player2IsCurrentlyPlaying && player2State.value.currentTime < player2State.value.duration) {
    player2.value?.play();
  }

  if (!player2WasPreviouslyPlaying && player2IsCurrentlyPlaying && !player1IsCurrentlyPlaying && player1State.value.currentTime < player1State.value.duration) {
    player1.value?.play();
  }
});

function closeComparison() {
  emit('close');
}

function setVersion1(id: string) {
  emit('changeVersions', id, props.version2Id);
}

function setVersion2(id: string) {
  emit('changeVersions', props.version1Id, id);
}

function play() {
  players.forEach(p => p.value?.play());
}

function pause() {
  players.forEach(p => p.value?.pause());
}

function seekTo(timestamp: number) {
  players.forEach(p => p.value?.seek(timestamp));
}

function seekToComment(comment: CommentWithAuthor) {
  if (mediaType.value !== 'video' && mediaType.value !== 'audio') {
    return;
  }

  if (!player1.value || !player2.value) {
    // if the video ref isn't ready yet (e.g. component just mounted),
    // wait before we seek
    // TODO: warn, if video player is never ready, this will lead to infinite async recursion
    // and cause the page to hang. Is the player guaranteed to be available?
    nextTick(() => seekToComment(comment));
    return;
  }

  if (comment.timestamp === null || comment.timestamp === undefined) {
    return;
  }

  seekTo(comment.timestamp);
}

function selectComment(comment: CommentWithAuthor) {
  selectedCommentId.value = comment._id;
  router.push({ query: { ...route.query, comment: comment._id }});
}

function unselectComment() {
  selectedCommentId.value = undefined;
  const newQuery = { ...route.query };
  delete newQuery.comment;
  router.push({ query: newQuery });
}

function scrollToComment(comment: CommentWithAuthor) {
  nextTick(() => commentsPanel.value?.scrollToComment(comment));
}

function handleCommentClicked(comment: CommentWithAuthor) {
  seekToComment(comment);
  selectComment(comment);
  
  scrollToComment(comment);
}

function handlePlayerCommentClicked(comment: CommentWithAuthor) {
  handleCommentClicked(comment);
}

function handleCommentInputFocus() {
  pause();
  unselectComment();
}

async function handleSendTopLevelComment({ includeTimestamp } : { includeTimestamp: boolean }) {
  await sendTopLevelCommentCore({
    selectedVersionId: selectedVersionId.value,
    timestamp: currentPlayTime.value,
    includeTimestamp
  });
}
</script>