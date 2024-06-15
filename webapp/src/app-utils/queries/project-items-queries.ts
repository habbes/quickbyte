import { useQuery, QueryClient, useMutation, useQueryClient } from '@tanstack/vue-query'
import { trpcClient } from '../api';
import type { MaybeRef, MaybeRefOrGetter } from 'vue';
import type { Folder, DeleteProjectItemsArgs, DeletionCountResult, GetProjectItemsResult, Media, ProjectItem, ProjectItemRef } from "@quickbyte/common";
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
        queryFn: () => trpcClient.getProjectItems.query({
            projectId: unref(projectId),
            folderId: unref(folderId)
        }),
        staleTime: 300_000, // 5 minutes,
        enabled: opts?.enabled
    });

    return result;
}

export function useDeleteProjectItemsMutation() {
    const client = useQueryClient();
    const mutation = useMutation<DeletionCountResult, Error, DeleteProjectItemsArgs & { folderId?: string }>({
        mutationFn: ({ projectId, items }) => trpcClient.deleteProjectItems.mutate({ projectId, items }),
        onSuccess: (result, args) => {
            // NOTE: This assumes all items are deleted from the same folder.
            // Currently the UI only supports this scenario (but the API endpoint doesn't have that restriction).
            // If our UI supports deleting items from different folders in one request, we should
            // update this method.
            deleteProjectItemsInQuery(
                client,
                args.projectId,
                args.folderId,
                ...args.items.map(({ id, type }) => ({ type, _id: id}))
            );
        }
    });

    return mutation;
}

/**
 * Adds or updates the specified items
 * to the project items query data cache
 * @param queryClient 
 * @param projectId 
 * @param folderId 
 * @param itemsToAdd 
 */
export function upsertProjectItemsInQuery(
    queryClient: QueryClient,
    projectId: MaybeRef<string>,
    folderId: MaybeRef<string|undefined>,
    ...itemsToAdd: ProjectItem[]
) {
    const queryKey = getProjectItemsQueryKey(projectId, folderId);
    queryClient.setQueryData<GetProjectItemsResult>(queryKey, oldData => {
        if (!oldData) {
            // if data doesn't exist, we don't initialize the data with the items to add
            // because we don't have enough information to construct the folder with path
            return;
        }

        const updatedItems = [...oldData.items];

        for (const newItem of itemsToAdd) {
            const currentIndex = updatedItems.findIndex(i => i._id === newItem._id && i.type === newItem.type);
            if (currentIndex === -1) {
                updatedItems.push(newItem);
            }
            else {
                updatedItems[currentIndex] = mergeItems(updatedItems[currentIndex], newItem);
            }
        }

        return {
            ...oldData,
            items: updatedItems
        };
    });
}

/**
 * Removes the specified items
 * from the project query data cache.
 * @param queryClient 
 * @param projectId 
 * @param folderId 
 * @param itemsToDelete 
 */
export function deleteProjectItemsInQuery(
    queryClient: QueryClient,
    projectId: MaybeRef<string>,
    folderId: MaybeRef<string|undefined>,
    ...itemsToDelete: ProjectItemRef[]
) {
    const queryKey = getProjectItemsQueryKey(projectId, folderId);
    queryClient.setQueryData<GetProjectItemsResult>(queryKey, oldData => {
        if (!oldData) {
            return;
        }
    
        const updatedItems = oldData.items.filter(item => 
                !itemsToDelete.some(toDelete => item._id === toDelete._id && item.type === toDelete.type));
        
        return {
            ...oldData,
            items: updatedItems
        };
    });
}

function mergeItems<TItem extends { item: any }, TResult extends TItem>(oldItem: TItem, newItem: TItem): TResult {
    const mergedInnerItem = Object.assign({}, oldItem.item, newItem.item);
    const mergedItem = { ...oldItem, ...newItem, item: mergedInnerItem };
    return mergedItem as TResult;
}