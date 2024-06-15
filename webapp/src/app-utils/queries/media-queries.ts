import { useQuery, QueryClient } from '@tanstack/vue-query'
import { trpcClient } from '../api';
import type { MaybeRef, MaybeRefOrGetter } from 'vue';
import { unref } from "vue";

export function getMediaAssetQueryKey(projectId: MaybeRef<string>, mediaId?: MaybeRef<string|undefined>) {
    return ['media', projectId, mediaId];
}

export interface MediaAssetQueryOptions {
    enabled?: MaybeRefOrGetter<boolean>;
}

export function useMediaAssetQuery(projectId: MaybeRef<string>, mediaId: MaybeRef<string>, opts?: MediaAssetQueryOptions) {
    const queryKey = getMediaAssetQueryKey(projectId, mediaId);
    const result = useQuery({
        queryKey,
        queryFn: () => trpcClient.getProjectMediaById.query({
            projectId: unref(projectId),
            mediaId: unref(mediaId)
        }),
        enabled: opts?.enabled
    });

    return result;
}

export function invalidMediaAssetQuery(client: QueryClient, projectId: MaybeRef<string>, mediaId: MaybeRef<string>) {
    client.invalidateQueries({ queryKey: getMediaAssetQueryKey(projectId, mediaId) });
}