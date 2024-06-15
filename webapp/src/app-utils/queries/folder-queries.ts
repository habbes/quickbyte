import { useQueryClient, useMutation } from '@tanstack/vue-query'
import { trpcClient } from '../api';
import { upsertProjectItemsInQuery } from './project-items-queries';
import type { Folder, UpdateFolderArgs, ProjectFolderItem } from "@quickbyte/common";

export function useUpdateFolderMutation() {
    const client = useQueryClient();
    const mutation = useMutation<Folder, Error, UpdateFolderArgs>({
        mutationFn: (args) => trpcClient.updateFolder.mutate(args),
        onSuccess: (result) => {
            upsertProjectItemsInQuery(client, result.projectId, result.parentId || undefined, converFolderToProjectItem(result));
        }
    });

    return mutation;
}

function converFolderToProjectItem(folder: Folder): ProjectFolderItem {
    return {
        _id: folder._id,
        name: folder.name,
        _createdAt: folder._createdAt,
        _updatedAt: folder._updatedAt,
        type: 'folder',
        item: folder
    };
}
