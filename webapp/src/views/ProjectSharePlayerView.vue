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
</template>
<script lang="ts" setup>
import { ref, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { PlayerWrapper } from "@/components/player";
import { projectShareStore, trpcClient, wrapError } from "@/app-utils";
import type { FolderPathEntry, MediaWithFileAndComments, ProjectItem } from "@quickbyte/common";
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
const currentFolderId = ref<string>();
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

function handleClosePlayer() {
  router.push({
    name: 'project-share',
    params: {
      shareId: share.value?._id, code: code.value, folderId: currentFolderId.value
    },
    query: {
      version: selectedVersionId.value
    }
  });
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

    // fetch folders/files in the same path to populate
    // the in-player browser
    currentFolderId.value = media.value.folderId || undefined;
    const result = await trpcClient.getProjectShareItems.query({
      shareId: share.value._id,
      code: code.value,
      password: password.value,
      folderId: currentFolderId.value
    });

    if ('items' in result) {
      browserItems.value = result.items;
      browserItemsPath.value = result.path;
    }
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
  const result = await trpcClient.getProjectShareItems.query({
    shareId: ensure(share.value)._id,
    code: ensure(code.value),
    password: password.value,
    folderId
  });
  
  if ('items' in result) {
    browserItems.value = result.items;
    browserItemsPath.value = result.path;
  }
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