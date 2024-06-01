import { useQuery } from '@tanstack/vue-query'
import { trpcClient } from './api';

export function getProjectItemsQueryKey(projectId: string, folderId?: string) {
    return ['projects', projectId, folderId, 'items'];
}

export function useProjectItemsQuery(projectId: string, folderId?: string) {
    const queryKey = getProjectItemsQueryKey(projectId, folderId);
    const result = useQuery({
        queryKey,
        queryFn: () => trpcClient.getProjectItems.query({ projectId, folderId })
    });

    return result;
}