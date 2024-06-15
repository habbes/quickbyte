import { type MaybeRef } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { trpcClient } from "@/app-utils";
import { GetProjectShareLinkItemsArgs } from "@quickbyte/common";

export function getProjectShareItemsQueryKey(
    shareId: MaybeRef<string>,
    code: MaybeRef<string|undefined>,
    folderId: MaybeRef<string|undefined>,
    password: MaybeRef<string|undefined>
) {
    return ['projectShareItems', shareId, code, folderId, password] as const
}

export interface ProjectShareItemQueryArgs {
    shareId: MaybeRef<string>;
    code: MaybeRef<string|undefined>;
    folderId: MaybeRef<string|undefined>;
    password: MaybeRef<string|undefined>;
}

export interface ProjectShareItemsQueryOptions {
    enabled?: MaybeRef<boolean>;
    errorImmediately?: MaybeRef<boolean>;
}

export function useProjectShareItemsQuery(
    { shareId, code, folderId, password }: ProjectShareItemQueryArgs,
    opts?: ProjectShareItemsQueryOptions
) {
    const queryKey = getProjectShareItemsQueryKey(shareId, code, folderId, password);
    const query = useQuery({
        queryKey,
        queryFn: ({ queryKey: [_key, shareId, code, folderId, password]}) => {
            if (!code) {
                return;
            }
            const args: GetProjectShareLinkItemsArgs = {
                shareId: shareId,
                code: code
            };
        
            if (folderId) {
                args.folderId = folderId;
            }
        
            if (password) {
                args.password = password
            }

            return trpcClient.getProjectShareItems.query(args);
        },
        enabled: opts?.enabled,
        retry: opts?.errorImmediately ? 0 : 3
    });

    return query;
}