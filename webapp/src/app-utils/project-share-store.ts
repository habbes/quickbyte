import { ref } from "vue";
import type { ProjectShareLinkItemsSuccessResult } from "@quickbyte/common";

function createProjectShareStore() {
    const share = ref<ProjectShareLinkItemsSuccessResult>();
    const code = ref<string>();

    function setShare(value: ProjectShareLinkItemsSuccessResult) {
        share.value = value;
    }

    function setShareCode(value: string) {
        code.value = value;
    }

    return {
        share,
        code,
        setShare,
        setShareCode
    }
}

export const projectShareStore = createProjectShareStore();
