import { ref, computed } from "vue";
import type { ProjectItem } from "@quickbyte/common";

type SortDirection = 'asc' | 'desc';

type QueryOptions = {
    sortBy?: {
        field: string,
        direction: SortDirection
    }
};

export function useProjectItemsQueryOptions() {
    const sortFields = [
        {
            field: '_createdAt',
            displayName: 'Date Uploaded',
            ascName: 'Oldest first',
            descName: 'Newest first',
            compare: (a: ProjectItem, b: ProjectItem) => {
                return new Date(a._createdAt).getTime() - new Date(b._createdAt).getTime();
            }
        },
        {
            field: '_updatedAt',
            displayName: 'Date modified',
            ascName: 'Oldest first',
            descName: 'Newest first',
            compare: (a: ProjectItem, b: ProjectItem) => {
                return new Date(a._updatedAt).getTime() - new Date(b._updatedAt).getTime();
            }
        },
        {
            field: 'name',
            displayName: 'Name',
            ascName: 'A-Z',
            descName: 'Z-A',
            compare: (a: ProjectItem, b: ProjectItem) => {
                return a.name.localeCompare(b.name);
            }
        }
    ];

    function selectSortField(field: string, direction?: SortDirection) {
        if (!queryOptions.value) {
            queryOptions.value = {};
        }

        queryOptions.value.sortBy = {
            field,
            direction: direction || 'asc'
        };
    }

    const queryOptions = ref<QueryOptions>();
    const selectedSortField = computed(() => {
        if (!(queryOptions.value) || !(queryOptions.value.sortBy)) {
            return;
        }

        return sortFields.find(f => f.field === queryOptions.value!.sortBy!.field);
    });

    function reset() {
        queryOptions.value = undefined;
    }

    return {
        queryOptions,
        sortFields,
        selectSortField,
        selectedSortField,
        reset
    }
}
