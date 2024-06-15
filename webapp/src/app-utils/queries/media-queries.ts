import { useQuery, QueryClient, useQueryClient, useMutation } from '@tanstack/vue-query'
import { trpcClient } from '../api';
import type { MaybeRef, MaybeRefOrGetter } from 'vue';
import { unref, watch } from "vue";
import { upsertProjectItemsInQuery } from './project-items-queries';
import type { ProjectMediaItem, UpdateMediaVersionsArgs, Media, MediaWithFileAndComments, UpdateMediaArgs, CreateMediaCommentArgs, Comment, WithChildren, CommentWithAuthor, DeleteMediaCommentArgs } from "@quickbyte/common";
import { logger } from '../logger';

export function getMediaAssetQueryKey(projectId: MaybeRef<string>, mediaId?: MaybeRef<string>) {
    return ['media', projectId, mediaId];
}

export interface MediaAssetQueryOptions {
    enabled?: MaybeRefOrGetter<boolean>;
}

export function useMediaAssetQuery(projectId: MaybeRef<string>, mediaId: MaybeRef<string>, opts?: MediaAssetQueryOptions) {
    const queryKey = getMediaAssetQueryKey(projectId, mediaId);
    const client = useQueryClient();
    const result = useQuery({
        queryKey,
        queryFn: () => trpcClient.getProjectMediaById.query({
            projectId: unref(projectId),
            mediaId: unref(mediaId)
        }),
        enabled: opts?.enabled,
    });

    // When media is re-fetched, update the corresponding entry
    // in the project items collection so that it can go in sync
    // immediately before the entire project items query needs to be refreshed
    watch(result.data, (media) => {
        if (!media) {
            return;
        }

        upsertProjectItemsInQuery(client, projectId, media.folderId || undefined, convertMediaToProjectItem(media));
    });

    return result;
}

export function useUpdateMediaMutation() {
    const client = useQueryClient();
    const mutation = useMutation<Media, Error, UpdateMediaArgs>({
        mutationFn: (args) => trpcClient.updateMedia.mutate(args),
        onSuccess: (result) => {
            updateMediaAssetInQuery(client, result);
            upsertProjectItemsInQuery(client, result.projectId, result.folderId || undefined, convertMediaToProjectItem(result));
        }
    });

    return mutation;
}

export function useUpdateMediaVersionsMutation() {
    const client = useQueryClient();
    const mutation = useMutation<Media, Error, UpdateMediaVersionsArgs>({
        mutationFn: (args) => trpcClient.updateMediaVersions.mutate(args),
        onSuccess: (result) => {
            updateMediaAssetInQuery(client, result);
            upsertProjectItemsInQuery(client, result.projectId, result.folderId || undefined, convertMediaToProjectItem(result));
        }
    });

    return mutation
}

export function useCreateMediaCommentMutation() {
    const client = useQueryClient();
    const mutation = useMutation<WithChildren<CommentWithAuthor>, Error, CreateMediaCommentArgs>({
        mutationFn: (args) => trpcClient.createMediaComment.mutate(args),
        onSuccess: (result) => {
            upsertMediaCommentInQuery(client, result);
        }
    });

    return mutation;
}

export function useDeleteMediaCommentMutation() {
    const client = useQueryClient();
    const mutation = useMutation<void, Error, DeleteMediaCommentArgs & { parentId?: string }>({
        mutationFn: ({ projectId, mediaId, commentId }) => trpcClient.deleteMediaComment.mutate({
            projectId,
            mediaId,
            commentId
        }),
        onSuccess: (result, args) => {
            deleteMediaCommentInQuery(client, args.projectId, args.mediaId, args.parentId, args.commentId);
        }
    });

    return mutation;
}

export function invalidateMediaAssetQuery(client: QueryClient, projectId: MaybeRef<string>, mediaId: MaybeRef<string>) {
    client.invalidateQueries({ queryKey: getMediaAssetQueryKey(projectId, mediaId) });
}

export function updateMediaAssetInQuery<TMedia extends Media>(
    client: QueryClient,
    update: TMedia,
)
{
    const queryKey = getMediaAssetQueryKey(update.projectId, update._id);
    client.setQueryData<MediaWithFileAndComments>(queryKey, oldData => {
        if (!oldData) {
            // if the item doesn't already exist, we abort instead of attempting to
            // add the update to the query. We do this because the media we cache
            // is fetched with the file and author information, but most results
            // of media update operation do not contain this extra information.
            return;
        }

        // don't overwrite versions array because the incoming update
        // might not contain the expanded files
        let updatedVersions = oldData.versions;
        if (update.versions) {
            // ignore new versions which don't exist in the old set because the might be missing required
            // fields like the extended file
            const newVersions = update.versions.filter(v => oldData.versions.some(oldVersion => v._id === oldVersion._id));
            updatedVersions = newVersions.map(v => {
                const oldVersion = oldData.versions.find(old => old._id === v._id)!;
                const updatedVersion = { ...oldVersion, ...v };
                return updatedVersion;
            });
        }

        const updatedData = { ...oldData, ...update, versions: updatedVersions };

        return updatedData
    });
}

export function upsertMediaCommentInQuery(client: QueryClient, comment: WithChildren<CommentWithAuthor>) {
    const queryKey = getMediaAssetQueryKey(comment.projectId, comment.mediaId);
    client.setQueryData<MediaWithFileAndComments>(queryKey, oldData => {
        if (!oldData) {
            return;
        }

        const oldComments = oldData.comments;
        const newComments = [...oldComments];

        if (comment.parentId) {
            // We only support 2 levels of nesting, so the parent must be top-level
            const parentIndex = oldComments.findIndex(c => c._id === comment.parentId);
            if (parentIndex === -1) {
                logger.error(`Expected to find parent '${comment.parentId}' of comment '${comment._id}' in query cache of media ${comment.mediaId} but did not.`);
                return;
            }

            const oldParent = oldComments[parentIndex];
            const children = [...oldParent.children];
            const index = children.findIndex(c => c._id === comment._id);
            if (index === -1) {
                children.push(comment);
            } else {
                children[index] = Object.assign({}, children[index], comment);
            }

            newComments[parentIndex] = { ...oldParent, children };
        }
        else {
            const index = newComments.findIndex(c => c._id === comment._id);
            if (index === -1) {
                newComments.push(comment)
            } else {
                newComments[index] = Object.assign({}, newComments[index], comment);
            }
        }

        return { ...oldData, comments: newComments };
    });
}

export function updateMediaCommentInQuery(client: QueryClient, comment: Comment) {
    const queryKey = getMediaAssetQueryKey(comment.projectId, comment.mediaId);
    client.setQueryData<MediaWithFileAndComments>(queryKey, oldData => {
        if (!oldData) {
            return;
        }

        // TODO: consider parent
        const oldComments = oldData.comments;
        const index = oldComments.findIndex(c => c._id === comment._id);
        if (index === -1) {
            return;
        }

        const newComments = [...oldComments];
        newComments[index] = Object.assign({}, oldComments[index], comment);

        return { ...oldData, comments: newComments };
    });
}

export function deleteMediaCommentInQuery(client: QueryClient, projectId: string, mediaId: string, parentId: string|undefined, commentId: string) {
    const queryKey = getMediaAssetQueryKey(projectId, mediaId);
    client.setQueryData<MediaWithFileAndComments>(queryKey, oldData => {
        if (!oldData) {
            return;
        }

        const oldComments = oldData.comments;
        const newComments = [...oldComments];

        if (parentId) {
            // We only support 2 levels of nesting, so the parent must be top-level
            const parentIndex = oldComments.findIndex(c => c._id === parentId);
            if (parentIndex === -1) {
                logger.error(`Expected to find parent '${parentId}' of comment '${commentId}' in query cache of media ${mediaId} but did not.`);
                return;
            }

            const parent = Object.assign({}, oldComments[parentIndex]);
            parent.children = parent.children.filter(c => c._id !== commentId);
            newComments[parentIndex] = parent;
        } else {
            const index = newComments.findIndex(c => c._id === commentId);
            newComments.splice(index, 1);
        }

        return { ...oldData, comments: newComments };
    });
}

/**
 * Wraps the media object into a ProjectItem so that it
 * can be stored into the project items collection
 * @param media 
 */
function convertMediaToProjectItem<TMedia extends Media>(media: TMedia): ProjectMediaItem {
    return {
        _id: media._id,
        type: 'media',
        name: media.name,
        _createdAt: media._createdAt,
        _updatedAt: media._updatedAt,
        item: media
    }
}