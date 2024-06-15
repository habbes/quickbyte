<template>
  <PlayerWrapper
    v-if="project && media && selectedVersionId"
    :media="media"
    :selectedVersionId="selectedVersionId"
    :selectedCommentId="selectedCommentId"
    :role="project.role"
    :user="user"
    :otherItems="browserItems"
    :browserHasParentFolder="browserItemsPath.length > 0"
    allowComments
    allowDownload
    showAllVersions
    :allowUploadVersion="project.role === 'admin' || project.role === 'owner' || project.role === 'editor'"
    :allowVersionManagement="project.role === 'admin' || project.role === 'owner' || project.role === 'editor'"
    :sendComment="sendComment"
    :editComment="editComment"
    :deleteComment="deleteComment"
    @close="closePlayer()"
    @selectVersion="handleSelectVersion($event)"
    @newVersionUpload="handleVersionUpload()"
    @updateMedia="handleMediaUpdate($event)"
    @browserItemClick="handleBrowserItemClick($event)"
    @browserToParentFolder="handleBrowserToParentFolder()"
  />
  <PlayerSkeleton
    v-else-if="!media"
    allowComments
  />
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { logger, showToast, store, trpcClient, useProjectItemsQuery, wrapError } from "@/app-utils";
import type { MediaWithFileAndComments, ProjectItem, FolderPathEntry, Media } from "@quickbyte/common";
import { ensure, unwrapSingleton, unwrapSingletonOrUndefined } from "@/core";
import { PlayerWrapper, PlayerSkeleton } from "@/components/player";

const route = useRoute();
const router = useRouter();
const media = ref<MediaWithFileAndComments>();
const selectedVersionId = ref<string>();
const loading = ref(true);
const selectedCommentId = ref<string>();

const user = store.user;
const projectId = computed(() => unwrapSingleton(route.params.projectId));
const project = computed(() => store.projects.value.find(p => p._id === projectId.value));

const browserItemsQueryEnabled = computed(() => !!media.value);
const browserItemsFolderId = ref<string>();
const browserItemsQuery = useProjectItemsQuery(projectId, browserItemsFolderId, { enabled: browserItemsQueryEnabled });
const browserItems = computed(() => browserItemsQuery.data.value?.items || []);
const browserItemsPath = computed(() => browserItemsQuery.data.value?.folder?.path || []);


watch(() => route.params.mediaId, () => {
  const queriedCommentId = unwrapSingletonOrUndefined(route.query.comment || undefined);
  const queriedVersionId = unwrapSingletonOrUndefined(route.query.version || undefined);

  return wrapError(async () => {
    const projectId = unwrapSingleton(ensure(route.params.projectId));
    const mediaId = unwrapSingleton(ensure(route.params.mediaId));
    media.value = await trpcClient.getProjectMediaById.query({
      projectId: projectId,
      mediaId: mediaId
    });

    selectedVersionId.value = queriedVersionId && media.value.versions.find(v => v._id === queriedVersionId) ? queriedVersionId : media.value.preferredVersionId;
    selectedCommentId.value = queriedCommentId || undefined;

    // fetch files and folders in the same parent folder as the media
    // to enable navigation in the embedded file browser
    navigateBrowserToFolder(media.value.folderId || undefined);
  },
  {
    finally: () => loading.value = false
  })
}, { immediate: true });

async function handleVersionUpload() {
  // TODO: since we don't have the file, for now just reload
  // the entire media object and update the local instance
  // this is unnecessarily costly, we just need to load
  // the downloadable file for the new preferred version
  // but wanted to get this done quickly by re-using existing
  // endpoints and maybe optmize later.
  try {
    media.value = await trpcClient.getProjectMediaById.query({
      projectId: route.params.projectId as string,
      mediaId: route.params.mediaId as string
    });
    selectedVersionId.value = media.value.preferredVersionId;
  } catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e.message, e);
  }
};

function handleMediaUpdate(updatedMedia: Media) {
   // TODO: since we don't have the file, for now just reload
  // the entire media object and update the local instance
  // this is unnecessarily costly, we just need to load
  // the downloadable file. I'll the update should probably contain media files
  return handleVersionUpload();
}

async function handleSelectVersion(versionId: string) {
  selectedVersionId.value = versionId;
  router.push({ query: { ...route.query, version: versionId }});
}

function closePlayer() {
  router.push({ name: 'project-media', params: { projectId: route.params.projectId as string, folderId: media.value?.folderId } })
}

async function sendComment(args: {
  text: string;
  versionId: string;
  timestamp?: number;
  parentId?: string;
}) {
  const projectId = ensure(route.params.projectId) as string;
  const mediaId = ensure(route.params.mediaId) as string;

  const comment = await trpcClient.createMediaComment.mutate({
    projectId: projectId,
    mediaId: mediaId,
    mediaVersionId: args.versionId,
    text: args.text,
    timestamp: args.timestamp,
    parentId: args.parentId
  });
    
  return { ...comment, children: [] };
}

async function editComment({ commentId, text }: { commentId: string, text: string }) {
  if (!media.value) {
    throw new Error('Media has not loaded.');
  }

  if (!project.value) {
    throw new Error('Project has not loaded.');
  }

  const comment = await trpcClient.updateMediaComment.mutate({
      projectId: media.value.projectId,
      mediaId: media.value._id,
      commentId,
      text
  });

  return comment;
}

async function deleteComment({ commentId } : { commentId: string }) {
  if (!media.value) return;
  await trpcClient.deleteMediaComment.mutate({
    projectId: media.value.projectId,
    commentId: commentId,
    mediaId: media.value._id
  });
}

async function handleBrowserItemClick(item: ProjectItem) {
  if (item.type === 'media') {
    const projectId = unwrapSingleton(ensure(route.params.projectId));
    router.push({
      name: 'player',
      params: {
        projectId: projectId,
        mediaId: item._id
      }
    });

    return;
  }

  await navigateBrowserToFolder(item._id);
}

function handleBrowserToParentFolder() {
  return navigateBrowserToFolder();
}

async function navigateBrowserToFolder(folderId?: string) {
  browserItemsFolderId.value = folderId;
}

</script>