<template>
  <div>Comparer</div>
  <div>{{ version1?.name  }}</div>
  <div>{{ version2?.name }}</div>
</template>
<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMediaAssetQuery, showToast } from "@/app-utils";
import { ensure, unwrapSingleton, unwrapSingletonOrUndefined } from "@/core";

const route = useRoute();
const router = useRouter();

const projectId = computed(() => unwrapSingleton(route.params.projectId));
const mediaId = computed(() => unwrapSingleton(route.params.mediaId));
const mediaQuery = useMediaAssetQuery(projectId, mediaId);
const media = computed(() => mediaQuery.data.value);
const version1Id = ref<string>();
const version2Id = ref<string>();

const version1 = computed(() => media.value?.versions.find(v => v._id === version1Id.value));
const version2 = computed(() => media.value?.versions.find(v => v._id === version2Id.value));

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


</script>