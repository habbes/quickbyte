<template>
  <VersioComparerWrapper
    v-if="media && version1Id && version2Id"
    :media="media"
    :version1Id="version1Id"
    :version2Id="version2Id"
    :user="user"
    :role="project.role"
    :selectedCommentId="selectedCommentId"
    allowDownload
    allowComments
    :sendComment="sendComment"
    @close="handleClose()"
    @changeVersions="handleSetVersions"
  />
</template>
<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMediaAssetQuery, showToast, store, useCreateMediaCommentMutation } from "@/app-utils";
import { ensure, unwrapSingleton, unwrapSingletonOrUndefined } from "@/core";
import { VersioComparerWrapper } from "@/components/comparer";
import { type SendCommentHandler } from "@/components/player";

const route = useRoute();
const router = useRouter();

const user = store.user;
const projectId = computed(() => unwrapSingleton(route.params.projectId));
const project = computed(() => ensure(store.projects.value.find(p => p._id === projectId.value), `Project ${projectId.value} not found.`));
const mediaId = computed(() => unwrapSingleton(route.params.mediaId));
const mediaQuery = useMediaAssetQuery(projectId, mediaId);
const media = computed(() => mediaQuery.data.value);
const selectedCommentId = ref<string>();

const version1Id = computed(() => {
  if (!media.value) return;
  const queriedV1Id = unwrapSingletonOrUndefined(route.query.v1);
  return queriedV1Id ? queriedV1Id : ensure(media.value.versions[0]?._id);
});
const version2Id =  computed(() => {
  if (!media.value) return;

  const queriedV2Id = unwrapSingletonOrUndefined(route.query.v2);
  return queriedV2Id ? queriedV2Id : ensure(media.value.versions.find(v => v._id !== version1Id.value))._id;
});

const createCommentMutation = useCreateMediaCommentMutation();

watch(media, () => {
  if (!media.value) {
    return;
  }

  const queriedCommentId = unwrapSingletonOrUndefined(route.query.comment);
  selectedCommentId.value = queriedCommentId || undefined;

  if (media.value.versions.length < 2) {
    // go to player view if media only has 1 version
    showToast('A media asset must have at least two versions to compare.', 'error');
    router.push({ name: 'player', params: { projectId: projectId.value, mediaId: media.value._id }});
    return;
  }
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

function handleSetVersions(v1Id: string, v2Id: string) {
  router.push({ query: { v1: v1Id, v2: v2Id } });
}

const sendComment: SendCommentHandler = async (args) => {
  const comment = await createCommentMutation.mutateAsync({
    projectId: projectId.value,
    mediaId: mediaId.value,
    mediaVersionId: args.versionId,
    text: args.text,
    timestamp: args.timestamp,
    parentId: args.parentId,
    annotations: args.annotations
  });
    
  return { ...comment, children: [] };
};
</script>