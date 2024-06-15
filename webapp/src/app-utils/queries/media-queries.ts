import { useQuery, QueryClient, useQueryClient } from '@tanstack/vue-query'
import { trpcClient } from '../api';
import type { MaybeRef, MaybeRefOrGetter } from 'vue';
import { unref, watch } from "vue";
import { upsertProjectItemsInQuery } from './project-items-queries';

export function getMediaAssetQueryKey(projectId: MaybeRef<string>, mediaId?: MaybeRef<string|undefined>) {
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

        upsertProjectItemsInQuery(client, projectId, media.folderId || undefined, {
            _id: media._id,
            type: 'media',
            name: media.name,
            _createdAt: media._createdAt,
            _updatedAt: media._updatedAt,
            item: media
        });
    });

    return result;
}

export function invalidMediaAssetQuery(client: QueryClient, projectId: MaybeRef<string>, mediaId: MaybeRef<string>) {
    client.invalidateQueries({ queryKey: getMediaAssetQueryKey(projectId, mediaId) });
}