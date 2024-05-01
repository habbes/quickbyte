<template>
  <PlayerWrapper
    v-if="share && media"
    :media="media"
    :allowComments="share.allowComments"
    :allowDownload="share.allowDownload"
    :showAllVersions="share.showAllVersions"
    :allowUploadVersion="false"
    @close="handleClosePlayer()"
  />
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import PlayerWrapper from "@/components/PlayerWrapper.vue";
import { projectShareStore } from "@/app-utils";
import type { MediaWithFileAndComments } from "@quickbyte/common";

const share = projectShareStore.share;
const code = projectShareStore.code;
const route = useRoute();
const router = useRouter();
const media = ref<MediaWithFileAndComments>();

function handleClosePlayer() {
  router.push({ name: 'project-share', params: { shareId: share.value?._id, code: code.value }  });
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