<template>
  <PlayerWrapper
    v-if="share && media"
    :media="media"
    :role="'reviewer'"
    :allowComments="share.allowComments"
    :allowDownload="share.allowDownload"
    :showAllVersions="share.showAllVersions"
    :allowUploadVersion="false"
    :sendComment="sendComment"
    @close="handleClosePlayer()"
  />
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import PlayerWrapper from "@/components/PlayerWrapper.vue";
import { projectShareStore, trpcClient } from "@/app-utils";
import type { MediaWithFileAndComments } from "@quickbyte/common";

const share = projectShareStore.share;
const code = projectShareStore.code;
const route = useRoute();
const router = useRouter();
const media = ref<MediaWithFileAndComments>();

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
    return;
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
    authorName: name || share.value.sharedEmail.split('@')[0]
  });

  return comment;
}

watch(() => route.params.mediaId, () => {
  if (!share.value) {
    return;
  }

  const item = share.value.items.find(i => i.type === 'media' && i._id === route.params.mediaId as string);
  if (!item || item.type !== 'media') {
    return;
  }

  

  // TODO load media from API in case it's not locally available
  media.value = item.item;
}, {
  immediate: true
});
</script>