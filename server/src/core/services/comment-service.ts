import { AuthContext, Comment, CommentWithAuthor, createPersistedModel, Media, WithChildren, CreateMediaCommentArgs, UpdateMediaCommentArgs, User } from "../models.js";
import { createAppError, createResourceNotFoundError, createNotFoundError, createValidationError } from "../error.js";
import { ITransferService } from "./index.js";
import { Database } from "../db.js";
import { wrapError } from "../utils.js";

export interface MediaServiceConfig {
    transfers: ITransferService
}

export class CommentService {

    constructor(private db: Database, private authContext: AuthContext) {
    }

    createMediaComment(media: Media, args: CreateMediaCommentArgs): Promise<WithChildren<CommentWithAuthor>> {
        return createMediaComment(
            this.db,
            media,
            args,
            this.authContext.user
        );
    }

    getMediaComments(mediaId: string, authorId?: string): Promise<WithChildren<CommentWithAuthor>[]> {
        return getMediaComments(this.db, mediaId, authorId);
    }

    deleteMediaComment(projectId: string, mediaId: string, commentId: string, isOwnerOrAdmin: boolean): Promise<void> {
        return deleteMediaComment(this.db, {
            projectId,
            mediaId,
            commentId,
            isOwnerOrAdmin,
            user: this.authContext.user
        });
    }

    updateMediaComment(args: UpdateMediaCommentArgs): Promise<Comment> {
        return updateMediaComment(this.db, args, this.authContext.user);
    }
}

export type ICommentService = Pick<CommentService, 'createMediaComment'|'getMediaComments'|'deleteMediaComment'|'updateMediaComment'>;

export async function createMediaComment(db: Database, media: Media, args: CreateMediaCommentArgs, author: User): Promise<WithChildren<CommentWithAuthor>> {    
    const version = media.versions.find(v => v._id === args.mediaVersionId);
    if (!version) {
        throw createResourceNotFoundError(`The version '${args.mediaVersionId}' does not exist for the media '${media._id}'.`);
    }

    return createComment(db, {
        mediaId: media._id,
        projectId: media.projectId,
        mediaVersionId: args.mediaVersionId,
        text: args.text,
        timestamp: args.timestamp,
        parentId: args.parentId,
        annotations: args.annotations
    }, author);
}

async function createComment(db: Database, args: CreateMediaCommentArgs, user: User): Promise<WithChildren<CommentWithAuthor>> {
    return wrapError(async () => {
        console.log('args', args);
        if (!args.text && !args.annotations) {
            throw createValidationError("A comment cannot be created without text or annotations.");
        }

        if (args.parentId) {
            await ensureCommentReplyValid(db, args);
        }

        const comment: Comment = {
            ...createPersistedModel(user._id),
            text: args.text,
            mediaId: args.mediaId,
            mediaVersionId: args.mediaVersionId,
            projectId: args.projectId,
            parentId: args.parentId,
            annotations: args.annotations
        };

        if (args.timestamp !== undefined && args.timestamp !== null) {
            comment.timestamp = args.timestamp;
        }

        await db.comments().insertOne(comment);
        return {
            ...comment,
            author: {
                _id: user._id,
                name: user.name
            },
            children: []
        };
        
    });
}

export function getMediaComments(db: Database, mediaId: string, authorId?: string) {
    return wrapError(async () => {
        const result = await db.comments().aggregate<WithChildren<CommentWithAuthor>>([
            {
                $match: {
                    mediaId: mediaId,
                    deleted: { $ne: true },
                    $or: [
                        { parentId: null },
                        { parentId: { $exists: false } }
                    ],
                    '_createdBy._id': authorId? authorId : { $ne: null}
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_createdBy._id',
                    foreignField: '_id',
                    as: 'author',
                    pipeline: [
                        { $limit: 1 },
                        {
                            $project: {
                                _id: 1,
                                name: 1
                            }
                        }
                    ],
                }
            },
            {
                $unwind: {
                    path: '$author'
                }
            },
            {
                $lookup: {
                    from: db.comments().collectionName,
                    localField: '_id',
                    foreignField: 'parentId',
                    as: 'children',
                    pipeline: [
                        {
                            $match: {
                                deleted: { $ne: true }
                            }
                        },
                        {
                            $lookup: {
                                from: db.users().collectionName,
                                localField: '_createdBy._id',
                                foreignField: '_id',
                                as: 'author',
                                pipeline: [
                                    { $limit: 1 },
                                    {
                                        $project: {
                                            _id: 1,
                                            name: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $unwind: {
                                path: '$author'
                            }
                        }
                    ]
                }
            }
        ]).toArray();;
        
        return result;
    });
}

export function updateMediaComment(db: Database, args: UpdateMediaCommentArgs, user: User): Promise<Comment> {
    return wrapError(async () => {
        const result = await db.comments().findOneAndUpdate({
            _id: args.commentId,
            projectId: args.projectId,
            mediaId: args.mediaId,
            deleted: { $ne: true },
            '_createdBy._id': user._id
        }, {
            $set: {
                text: args.text,
                _updatedBy: { type: 'user', _id: user._id },
                _updatedAt: new Date(),
            }
        }, {
            returnDocument: 'after'
        });

        if (!result.value) {
            throw createNotFoundError('comment');
        }

        return result.value;
    });
}


async function ensureCommentReplyValid(db: Database, args: CreateCommentArgs): Promise<void> {
    return wrapError(async () => {
        // the reply comment must apply to the same media as the parent,
        // but could be a different version
        const parent = await db.comments().findOne({
            _id: args.parentId,
            mediaId: args.mediaId,
            deleted: { $ne: true }
        });

        if (!parent) {
            throw createResourceNotFoundError(`The target comment does not exist.`);
        }

        if (parent.parentId) {
            // TODO: we currently do not supported deeply nested comments
            // but one day we may support this
            throw createAppError
        }
    });
}

export function deleteMediaComment(db: Database, args: {
    projectId: string,
    mediaId: string,
    commentId: string,
    isOwnerOrAdmin: boolean,
    user: User
}): Promise<void> {
    return wrapError(async () => {
        // if the user is a project owner or admin, then allow deleting
        // otherwise, allow deleting only if the user is the author
        const userAccessFilter = args.isOwnerOrAdmin ? {} : { '_createdBy._id': args.user._id };
        const result = await db.comments().updateOne(
            {
                _id: args.commentId,
                mediaId: args.mediaId,
                projectId: args.projectId,
                deleted: { $ne: true },
                ...userAccessFilter
            },
            {
                $set: {
                    deleted: true,
                    deletedAt: new Date(),
                    deletedBy: { type: 'user', _id: args.user._id }
                }
            }
        );

        if (result.modifiedCount == 0) {
            throw createNotFoundError('comment');
        }
    });
}