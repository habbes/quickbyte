import { useQuery, QueryClient } from '@tanstack/vue-query'
import { trpcClient } from '../api';
import type { MaybeRef } from 'vue';
import type { Folder, GetProjectItemsResult, Media, ProjectItem, ProjectItemRef } from "@quickbyte/common";
import { unref } from "vue";

export function getProjectItemsQueryKey(projectId: MaybeRef<string>, folderId?: MaybeRef<string|undefined>) {
    return ['projectItems', projectId, folderId];
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
                updatedItems[currentIndex] = Object.assign({}, updatedItems[currentIndex], newItem);
            }
        }

        return {
            ...oldData,
            items: updatedItems
        };
    });
}

/**
 * Updates the specified items in the
 * project items query data cache.
 * @param queryClient 
 * @param projectId 
 * @param folderId 
 * @param itemsToUpdate 
 */
export function updateProjectItemsInQuery(
    queryClient: QueryClient,
    projectId: MaybeRef<string>,
    folderId: MaybeRef<string|undefined>,
    ...itemsToUpdate:  Array<{ _id: string } & ({ type: 'folder', item: Partial<Folder> } | { type: 'media', item: Partial<Media> })>
) {
    const queryKey = getProjectItemsQueryKey(projectId, folderId);
    queryClient.setQueryData<GetProjectItemsResult>(queryKey, oldData => {
        if (!oldData) {
            return;
        }

        const updatedItems: ProjectItem[] = oldData.items.concat([]);
        for (const item of itemsToUpdate) {
            const index = updatedItems.findIndex(i => i._id === item._id && i.type === item.type);
            if (index === -1) {
                continue;
            }

            const original = updatedItems[index];
            updatedItems[index] = Object.assign({}, original, {
                ...({
                    item: { ...original.item, ...item.item },
                    name: item.item.name,
                    _updatedAt: item.item._updatedAt
                })
            });
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
