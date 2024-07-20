import { ref, computed, type Ref } from "vue";
import type { CommentWithAuthor, MediaWithFileAndComments } from "@quickbyte/common";
import { isDefined } from "@/core";

export interface CommentOperationHelpersContext {
    media: Ref<MediaWithFileAndComments>;
    seekToComment: (comment: CommentWithAuthor) => unknown;
    scrollToComment: (comment: CommentWithAuthor) => unknown;
}

export function useCommentOperationsHelpers(context: CommentOperationHelpersContext) {

    const comments = ref([...context.media.value.comments]);

    // we display all the timestamped comments before
    // all non-timestamped comments
    // timestamped comments are display in chronological order
    // based on timestamps
    // then we display comments in chronological order
    // based on creation date
    const sortedComments = computed(() => {
        const temp = [...comments.value];
        temp.sort((a, b) => {
        if (isDefined(a.timestamp) && !isDefined(b.timestamp)) {
            return -1;
        }
    
        if (isDefined(b.timestamp) && !isDefined(a.timestamp)) {
            return 1;
        }
    
        const aDate = new Date(a._createdAt);
        const bDate = new Date(b._createdAt);
        const dateDiff =  aDate.getTime() - bDate.getTime();
    
        if (isDefined(a.timestamp) && isDefined(b.timestamp)) {
            const timestampDiff = a.timestamp! - b.timestamp!;
            return timestampDiff === 0 ? dateDiff : timestampDiff;
        }
    
        return dateDiff;
        });
    
        return temp;
    });
    
    const timedComments = computed<WithChildren<TimedCommentWithAuthor>[]>(() =>
        sortedComments.value.filter(c => isDefined(c.timestamp)) as WithChildren<TimedCommentWithAuthor>[]);


    return {
        comments,
        sortedComments,
        timedComments
    };
}