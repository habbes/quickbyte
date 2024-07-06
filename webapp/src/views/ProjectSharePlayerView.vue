<template>
  <PlayerWrapper
    v-if="share && media"
    :media="media"
    :selectedVersionId="selectedVersionId || media.preferredVersionId"
    :otherItems="browserItems"
    :role="'reviewer'"
    :user="user"
    :allowComments="share.allowComments"
    :allowDownload="share.allowDownload"
    :showAllVersions="share.showAllVersions"
    :allowUploadVersion="false"
    :browserHasParentFolder="browserHasParentFolder"
    :sendComment="sendComment"
    :editComment="editComment"
    :deleteComment="deleteComment"
    @close="handleClosePlayer()"
    @browserItemClick="handleBrowserItemClick($event)"
    @browserToParentFolder="handleBrowserToParentFolder()"
    @selectVersion="handleVersionChange($event)"
  />
  <PlayerSkeleton
    v-else-if="!media"
    :allowComments="!!(share?.allowComments)"
    @close="handleClosePlayer()"
  />
</template>
<script lang="ts" setup>
import { ref, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { PlayerWrapper, PlayerSkeleton } from "@/components/player";
import { logger, projectShareStore, showToast, trpcClient, useProjectShareItemsQuery, wrapError } from "@/app-utils";
import type { FolderPathEntry, FrameAnnotationCollection, MediaWithFileAndComments, ProjectItem } from "@quickbyte/common";
import { ensure } from "@/core";

const share = projectShareStore.share;
const code = projectShareStore.code;
const password = projectShareStore.password;
const route = useRoute();
const router = useRouter();
const media = ref<MediaWithFileAndComments>();
const selectedVersionId = ref<string>();
const user = ref<{ _id: string, name: string }|undefined>();
/**
 * Folder containing the current media
 */
const currentFolderId = computed(() => media.value?.folderId || undefined);
/**
 * Items to display in the embedded file browser
 */
const browserItems = ref<ProjectItem[]>([]);
/**
 * The path of the folder containing the items
 * currently displayed in the embedded file browser
 */
const browserItemsPath = ref<FolderPathEntry[]>([]);
const browserHasParentFolder = computed(() => browserItemsPath.value.length > 0);

const browserItemsFolderId = ref<string>();
const shareId = computed(() => ensure(share.value)._id);
const queryEnabled = computed(() => !!media.value && !!code.value);
const browserItemsQuery = useProjectShareItemsQuery({
  shareId,
  code,
  password,
  folderId: browserItemsFolderId
}, { enabled: queryEnabled, errorImmediately: true });

watch(browserItemsQuery.data, (result) => {
  if (!result) {
    return;
  }

  if ('items' in result) {
    browserItems.value = result.items;
    browserItemsPath.value = result.path;
  }
});

watch(browserItemsQuery.error, (e: any) => {
  if (!e) {
    return;
  }
  // note that it's possible that the parent folder was not
  // shared, but we don't know that, especially when the url
  // this page is loaded or reloaded directly, meaning the
  // client doesn't know which folders the user navigated through
  // to get here. So we make a request just in case the folder
  // was shared, if it's not, the server will return
  // a not found or permission error.
  const data = e.data;
  if (
    data?.appCode === 'resourceNotFound' ||
    data?.appCode === 'permissionError' ||
    data?.httpStatus === 404 ||
    data?.httpStatus === 403
  ) {
    // Permission or not found error means the folder
    // was not shared. Then this file was probably shared directly and
    // is at the root of the share. So let's make another request to fetch
    // all root items.

    if (browserItemsFolderId.value) {
      // reset the folder so we can retry the request
      // from the project share's root
      browserItemsFolderId.value = undefined;
      return;
    } else {
      // if we got a 404/403 and we had not specified a folder,
      // then the user probably doesn't have permission to access
      // the share anymore, or it doesn't exist. Fail silently
      return;
    }
  }

  // some unexpected error
  logger?.error(e.message, e);
  showToast(e.message, 'error');
});

function handleClosePlayer() {
  router.push({
    name: 'project-share',
    params: {
      shareId: share.value?._id, code: code.value, folderId: currentFolderId.value
    },
    query: {
      // Since we're potentially redirecting to a folder
      // without verifying whether it's shared, let's signal
      // that the redirect is coming from the player so that we can
      // gracefully handle the potential permission error
      closePlayer: "1"
    }
  });
}

async function sendComment(args: {
  text?: string;
  versionId: string;
  timestamp?: number;
  parentId?: string;
  annotations?: FrameAnnotationCollection
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
    annotations: args.annotations,
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

watch(() => share, () => {
  if (!share.value) return;
  browserItemsPath.value = share.value.path;
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

    selectedVersionId.value = (route.query.version as string|undefined) || media.value.preferredVersionId;

    if (media.value.comments.length) {
      // because we can only see the comments from the current user or
      // their replies, we're sure that the author of any top-level comment
      // is the current user
      const comment = media.value.comments[0];
      user.value = comment.author;
    }

    // We want to display other files in the media's parent folder
    // in the sidebar browser.
    // It's possible that the media asset's folder is different
    // from the path we used to get here. This would be the case
    // if the media asset was shared directly, and is there for at the
    // root of the share, and also happens to be inside another folder
    // that's also shared. However, since that occurrence is unlikely
    // due to the hierarchical nature of the UI, I don't think
    // it's worth the effort to handle. It's also north a huge risk,
    // it would be a minor annoyance if it occurs, and if customers report
    // it we would fix it then.

    // set the parent folder to fetch files to populate the sidebar browser
    browserItemsFolderId.value = media.value.folderId || undefined;
  });
}, {
  immediate: true
});

watch(() => route.query.version, async () => {
  selectedVersionId.value = route.query.version as string|undefined;
}, {
  immediate: true
});

async function handleBrowserItemClick(item: ProjectItem) {
  if (!share.value || !code.value) {
    return;
  }

  if (item.type === 'media') {
    router.push({
      name: 'project-share-player',
      params: {
        shareId: share.value._id,
        code: code.value,
        mediaId: item._id
    }});

    return;
  }

  await navigateBrowserToFolder(item._id);
}

async function navigateBrowserToFolder(folderId?: string) {
  browserItemsFolderId.value = folderId;
}

function handleBrowserToParentFolder() {
  const pathSize = browserItemsPath.value.length;
  if (pathSize <= 1) {
    return navigateBrowserToFolder();
  }

  const parent = browserItemsPath.value[pathSize - 2];
  return navigateBrowserToFolder(parent._id);
}

function handleVersionChange(versionId: string) {
  if (!media.value) return;
  if (!share.value) return;
  if (!code.value) return;

  router.push({ query: { ...route.query, version: versionId } });
}
</script>