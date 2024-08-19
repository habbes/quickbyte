<template>
  <VersioComparerWrapper
    v-if="share && media && version1Id && version2Id"
    :media="media"
    :version1Id="version1Id"
    :version2Id="version2Id"
    :user="user"
    :role="'reviewer'"
    :selectedCommentId="selectedCommentId"
    :allowComments="share.allowComments"
    :allowDownload="share.allowDownload"
    :sendComment="sendComment"
    :editComment="editComment"
    :deleteComment="deleteComment"
    @close="handleClose"
    @changeVersions="handleSetVersions"
  />
</template>
<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { MediaWithFileAndComments } from "@quickbyte/common";
import { unwrapSingleton, unwrapSingletonOrUndefined, ensure } from "@/core";
import { logger, projectShareStore, showToast, trpcClient, useProjectShareItemsQuery, wrapError } from "@/app-utils";
import { VersioComparerWrapper } from "@/components/comparer";
import type { SendCommentHandler, DeleteCommentHandler, EditCommentHandler } from "@/components/player";


const route = useRoute();
const router = useRouter()

const share = projectShareStore.share;
const code = projectShareStore.code;
const password = projectShareStore.password;
const media = ref<MediaWithFileAndComments>();
const user = ref<{ _id: string, name: string }|undefined>();

const mediaId = computed(() => unwrapSingleton(route.params.mediaId));
const selectedCommentId = ref<string>();

const version1Id = computed(() => {
  if (!media.value) return;
  const queriedV1Id = unwrapSingletonOrUndefined(route.query.v1);
  return queriedV1Id ? queriedV1Id : ensure(media.value.versions[0]?._id);
});
const version2Id = computed(() => {
  if (!media.value) return;

  const queriedV2Id = unwrapSingletonOrUndefined(route.query.v2);
  return queriedV2Id ? queriedV2Id : ensure(media.value.versions.find(v => v._id !== version1Id.value))._id;
});

watch(() => route.params.mediaId, async () => {
  wrapError(async () => {
    if (!share.value || !code.value) {
      return;
    }

    const mediaId = route.params.mediaId as string;
    media.value = await trpcClient.getProjectShareMediaById.query({
      shareCode: code.value,
      shareId: share.value._id,
      password: password.value,
      mediaId: mediaId
    });

    if (media.value.comments.length) {
      // because we can only see the comments from the current user or
      // their replies, we're sure that the author of any top-level comment
      // is the current user
      const comment = media.value.comments[0];
      user.value = comment.author;
    }

    const queriedCommentId = unwrapSingletonOrUndefined(route.query.comment);
    selectedCommentId.value = queriedCommentId || undefined;
  });
}, {
  immediate: true
});

const sendComment: SendCommentHandler = async (args) => {
  if (!media.value || !share.value || !code.value) {
    throw new Error('Media has not loaded.');
  }

  if (!share.value.sharedEmail) {
    throw new Error("This link does not allow comments.")
  }

  const name = user.value?.name || '';

  const comment = await trpcClient.createProjectShareMediaComment.mutate({
    text: args.text,
    mediaId: media.value._id,
    mediaVersionId: args.versionId,
    timestamp: args.timestamp,
    parentId: args.parentId,
    shareId: share.value._id,
    shareCode: code.value,
    password: password.value,
    annotations: args.annotations,
    authorName: name || share.value.sharedEmail.split('@')[0]
  });

  if (!user.value) {
    user.value = comment.author;
  }

  return { ...comment, children: [] };
}

const editComment: EditCommentHandler = async (args) => {
  if (!media.value || !share.value || !code.value) {
    throw new Error('Media has not loaded.');
  }

  const comment = await trpcClient.updateProjectShareMediaComment.mutate({
    text: args.text,
    commentId: args.commentId,
    mediaId: media.value._id,
    shareCode: code.value,
    shareId: share.value._id,
    password: password.value
  });

  return comment;
}

const deleteComment: DeleteCommentHandler = async (args) => {
  if (!media.value || !share.value || !code.value) {
    return;
  }

  await trpcClient.deleteProjectShareMediaComment.mutate({
    commentId: args.commentId,
    mediaId: media.value._id,
    shareId: share.value._id,
    shareCode: code.value,
    password: password.value
  });
}

function handleSetVersions(v1Id: string, v2Id: string) {
  router.push({ query: { v1: v1Id, v2: v2Id } });
}

function handleClose() {
  // return to player
  router.push({
      name: 'project-share-player',
      params: {
        shareId: share.value?._id,
        code: code.value,
        mediaId: mediaId.value
      }
    });
}
</script>