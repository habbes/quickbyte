<template>
  <VersioComparerWrapper
    v-if="media && version1Id && version2Id"
    :media="media"
    :version1Id="version1Id"
    :version2Id="version2Id"
    @close="handleClose()"
  />
</template>
<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMediaAssetQuery, showToast } from "@/app-utils";
import { ensure, unwrapSingleton, unwrapSingletonOrUndefined } from "@/core";
import { VersioComparerWrapper } from "@/components/comparer";

const route = useRoute();
const router = useRouter();

const projectId = computed(() => unwrapSingleton(route.params.projectId));
const mediaId = computed(() => unwrapSingleton(route.params.mediaId));
const mediaQuery = useMediaAssetQuery(projectId, mediaId);
const media = computed(() => mediaQuery.data.value);
const version1Id = ref<string>();
const version2Id = ref<string>();

watch(media, () => {
  if (!media.value) {
    return;
  }

  if (media.value.versions.length < 2) {
    // go to player view if media only has 1 version
    showToast('A media asset must have at least two versions to compare.', 'error');
    router.push({ name: 'player', params: { projectId: projectId.value, mediaId: media.value._id }});
    return;
  }

  const queriedV1Id = unwrapSingletonOrUndefined(route.query.v1);
  const queriedV2Id = unwrapSingletonOrUndefined(route.query.v2);

  // TODO error handling
  version1Id.value = queriedV1Id ? queriedV1Id : ensure(media.value.versions[0]?._id);
  // If v2 not specified, pick the an arbitrary version other than v1
  version2Id.value = queriedV2Id ? queriedV2Id : ensure(media.value.versions.find(v => v._id !== version1Id.value))._id;
});

function handleClose() {
  if (!media.value) {
    router.push({
      name: 'projects-media',
      params: { projectId: projectId.value }
    });

    return;
  }

  router.push({
    name: 'player',
    params: {
      projectId: projectId.value,
      mediaId: media.value._id
    },
    query: {
      version: version1Id.value
    }
  });
}
</script>