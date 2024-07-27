import { ref, computed, type Ref } from "vue";
import type { MediaType, Comment, CommentWithAuthor, MediaWithFileAndComments, WithChildren, TimedCommentWithAuthor, FrameAnnotationCollection } from "@quickbyte/common";
import { isDefined } from "@/core";
import { provideCanvasController, type DrawingToolConfig } from "@/components/canvas";
import { showToast, logger } from "@/app-utils";

export interface CommentOperationHelpersContext {
    media: Ref<MediaWithFileAndComments>;
    mediaType: Ref<MediaType>;
    seekToComment: (comment: CommentWithAuthor) => unknown;
    scrollToComment: (comment: CommentWithAuthor) => unknown;
    sendComment: SendCommentHandler;
    editComment: EditCommentHandler
}

export function useCommentOperationsHelpers(context: CommentOperationHelpersContext) {

    const canvasController = provideCanvasController();
    const comments = ref([...context.media.value.comments]);
    const commentInputText = ref<string>();
    const drawingToolsActive = ref(false);
    const annotationsDrawingTool = ref<DrawingToolConfig>();
    const currentAnnotations = ref<FrameAnnotationCollection>();

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
            const dateDiff = aDate.getTime() - bDate.getTime();

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

    async function sendTopLevelComment({
        selectedVersionId,
        includeTimestamp,
        timestamp
    }: SendTopLevelCommentArgs) {
        if (!context.media.value) return;
        // Comment should have either text or annotations or both.
        // Annotations are only allowed for video (if timestamp is included) or images
        if (
            !commentInputText.value
            && !(currentAnnotations.value && currentAnnotations.value.annotations.length && includeTimestamp && context.mediaType.value === 'video')
            && !(currentAnnotations.value && currentAnnotations.value.annotations.length && context.mediaType.value === 'image')
        ) {
            return;
        }

        if (!context.media) return;
        if (!context.sendComment) throw new Error('sendComment func not set in props');

        try {
            const comment = await context.sendComment({
                text: commentInputText.value,
                timestamp: includeTimestamp && context.mediaType.value === 'audio' || context.mediaType.value === 'video' ? timestamp : undefined,
                versionId: selectedVersionId || context.media.value.preferredVersionId,
                annotations: currentAnnotations.value
            });

            // if (!context.user.value) {
            //     context.user.value = comment.author
            // };

            commentInputText.value = '';
            currentAnnotations.value = undefined;
            annotationsDrawingTool.value = undefined;
            drawingToolsActive.value = false;
            const commentIndex = comments.value.findIndex(c => c._id === comment._id);
            // Since the media comments maybe updated by the implementation of
            // props.sendComment, check first before adding the created comment to the list.
            // Ideally, we should refactor things such that the comments props are
            // updated by the caller whenever the a comment is added
            if (commentIndex === -1) {
                comments.value.push(comment);
            }

            context.scrollToComment(comment);

            return comment;
        }
        catch (e: any) {
            logger?.error(e.message, e);
            showToast(e.message, 'error');
        }
    }

    async function sendCommentReply({
        text,
        parentId
    }: SendReplyArgs) {
        if (!context.sendComment) throw new Error(`sendComment handler required`);

        try {
            // Parent must be top-level comment since we don't
            // support more than 1 level of nesting.
            const parent = comments.value.find(p => p._id === parentId);
            if (!parent) {
                logger?.error(`Attempting to send reply to comment '${parentId}' which was not found.`);
                throw new Error('The comment being replied to does not exist');
            }
            // Note: we don't support timestamps for replies
            // Replies are always to the same version as the parent
            const comment = await context.sendComment({
                text,
                parentId,
                versionId: parent.mediaVersionId
            });

            //   if (!user.value) {
            //     user.value = comment.author
            //   };

            const parentIndex = comments.value.findIndex(c => c._id === parentId);
            if (parentIndex !== -1) {
                const parent = comments.value[parentIndex];
                const childIndex = parent.children.findIndex(c => c._id === comment._id);
                // TODO: we push the comment here for backwards compatibility
                // The parent component should be responsible of updating the local
                // comments collection when a comment is sent. Once we've updated
                // scenarios that use this component, remove this code
                if (childIndex === -1) {
                    const children = parent.children.concat([comment]);
                    comments.value[parentIndex] = { ...parent, children }
                }
            }

            context.scrollToComment(comment);
        } catch (e: any) {
            logger?.error(e.message, e);
            showToast(e.message, 'error');
        }
    }

    function handleCommentDeleted(comment: CommentWithAuthor) {
        if (comment.parentId) {
            const parent = comments.value.find(c => c._id === comment.parentId);

            if (!parent) {
                return;
            }

            // TODO: we're performing this update for backwards compatibility
            // but the parent component should be responsible for updating
            // the comments collection. Once we refactor all scenarios
            // that use this component, we should remove this local update code.

            // NOTE: we only assume two-levels of nesting
            const indexToRemove = parent.children.findIndex(c => c._id === comment._id);
            if (indexToRemove === -1) {
                return;
            }

            parent.children.splice(indexToRemove, 1);
            return;
        }

        // top-level comment
        const indexToRemove = comments.value.findIndex(c => c._id === comment._id);
        if (indexToRemove === -1) {
            return;
        }

        comments.value.splice(indexToRemove, 1);
    }

    return {
        comments,
        sortedComments,
        timedComments,
        canvasController,
        commentInputText,
        drawingToolsActive,
        annotationsDrawingTool,
        currentAnnotations,
        sendTopLevelComment,
        sendCommentReply,
        editComment: context.editComment,
        handleCommentDeleted,
    };
}

export type SendCommentHandler = (args: {
    text?: string;
    versionId: string;
    timestamp?: number;
    parentId?: string;
    annotations?: FrameAnnotationCollection;
}) => Promise<WithChildren<CommentWithAuthor>>;

export type EditCommentHandler = (args: {
    commentId: string;
    text: string;
}) => Promise<Comment>;

export type DeleteCommentHandler = (args: {
    commentId: string;
    parentId?: string;
}) => Promise<unknown>;

interface SendTopLevelCommentArgs {
    selectedVersionId?: string;
    includeTimestamp: boolean;
    timestamp?: number;
}

interface SendReplyArgs {
    text: string;
    parentId: string;
}
