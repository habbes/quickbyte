import { useQuery } from '@tanstack/vue-query'
import { trpcClient } from '../api';
import type { MaybeRef, MaybeRefOrGetter } from 'vue';
import { unref } from "vue";

export function getProjectItemsQueryKey(projectId: MaybeRef<string>, folderId?: MaybeRef<string|undefined>) {
    return ['projectItems', projectId, folderId];
}

export interface ProjectItemsQueryOptions {
    enabled?: MaybeRefOrGetter<boolean>;
}

export function useProjectItemsQuery(projectId: MaybeRef<string>, folderId?: MaybeRef<string|undefined>, opts?: ProjectItemsQueryOptions) {
    const queryKey = getProjectItemsQueryKey(projectId, folderId);
    const result = useQuery({
        queryKey,
        queryFn: () => trpcClient().getProjectItems.query({
            projectId: unref(projectId),
            folderId: unref(folderId)
        }),
        staleTime: 300_000, // 5 minutes,
        enabled: opts?.enabled
    });

    return result;
}