import { useQuery, QueryClient } from '@tanstack/vue-query'
import { trpcClient } from './api';
import type { MaybeRef } from 'vue';
import type { GetProjectItemsResult, ProjectItem } from "@quickbyte/common";
import { unref } from "vue";

export function getProjectItemsQueryKey(projectId: MaybeRef<string>, folderId?: MaybeRef<string|undefined>) {
    return ['projects', projectId, folderId, 'items'];
}

export function useProjectItemsQuery(projectId: MaybeRef<string>, folderId?: MaybeRef<string|undefined>) {
    const queryKey = getProjectItemsQueryKey(projectId, folderId);
    const result = useQuery({
        queryKey,
        queryFn: () => trpcClient.getProjectItems.query({
            projectId: unref(projectId),
            folderId: unref(folderId)
        }),
        staleTime: 300_000 // 5 minutes
    });

    return result;
}

export function addProjectItems(queryClient: QueryClient, projectId: MaybeRef<string>, folderId: MaybeRef<string|undefined>, ...itemsToAdd: ProjectItem[]) {
    const queryKey = getProjectItemsQueryKey(projectId, folderId);
    queryClient.setQueryData<GetProjectItemsResult>(queryKey, oldData => {
        if (!oldData) {
            return {
                folder: undefined,
                items: itemsToAdd
            };
        }

        const updatedItems = [...oldData.items];

        for (const newItem of itemsToAdd) {
            const currentIndex = updatedItems.findIndex(i => i._id === newItem._id && i.type === newItem.type);
            if (currentIndex === -1) {
                updatedItems.push(newItem);
            }
            else {
                updatedItems[currentIndex] = Object.assign(updatedItems[currentIndex], newItem);
            }
        }

        return {
            ...oldData,
            items: updatedItems
        };
    })
}
