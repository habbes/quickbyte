<template>
  <PlayerWrapper
    v-if="share && media"
    :media="media"
    :role="'reviewer'"
    :user="user"
    :allowComments="share.allowComments"
    :allowDownload="share.allowDownload"
    :showAllVersions="share.showAllVersions"
    :allowUploadVersion="false"
    :sendComment="sendComment"
    :editComment="editComment"
    :deleteComment="deleteComment"
    @close="handleClosePlayer()"
  />
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { PlayerWrapper } from "@/components/player";
import { projectShareStore, trpcClient, wrapError } from "@/app-utils";
import type { MediaWithFileAndComments } from "@quickbyte/common";

const share = projectShareStore.share;
const code = projectShareStore.code;
const password = projectShareStore.password;
const route = useRoute();
const router = useRouter();
const media = ref<MediaWithFileAndComments>();
const user = ref<{ _id: string, name: string }|undefined>();

function handleClosePlayer() {
  router.push({ name: 'project-share', params: { shareId: share.value?._id, code: code.value }  });
}

async function sendComment(args: {
  text: string;
  versionId: string;
  timestamp?: number;
  parentId?: string;
}) {
  if (!media.value || !share.value || !code.value) {
    throw new Error('Media has not loaded.');
  }

  if (!share.value.sharedEmail) {
    throw new Error("This link does not allow comments.")
  }

  //const name = prompt('Please enter your name');
  const name = '';

  const comment = await trpcClient.createProjectShareMediaComment.mutate({
    text: args.text,
    mediaId: media.value._id,
    mediaVersionId: args.versionId,
    timestamp: args.timestamp,
    parentId: args.parentId,
    shareId: share.value._id,
    shareCode: code.value,
    password: password.value,
    authorName: name || share.value.sharedEmail.split('@')[0]
  });

  return { ...comment, children: [] };
}

async function editComment(args: { commentId: string, text: string }) {
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

async function deleteComment(args: { commentId: string }) {
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
  });
}, {
  immediate: true
});
</script>