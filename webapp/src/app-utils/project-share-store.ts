import { ref } from "vue";
import type { ProjectShareLinkItemsSuccessResult } from "@quickbyte/common";

function createProjectShareStore() {
    const share = ref<ProjectShareLinkItemsSuccessResult>();
    const code = ref<string>();
    const password = ref<string|undefined>();

    function setShare(value: ProjectShareLinkItemsSuccessResult) {
        share.value = value;
    }

    function setShareCode(value: string) {
        code.value = value;
    }

    function setSharePassword(value: string|undefined) {
        password.value = value;
    }

    return {
        share,
        code,
        password,
        setShare,
        setShareCode,
        setSharePassword
    }
}

export const projectShareStore = createProjectShareStore();
