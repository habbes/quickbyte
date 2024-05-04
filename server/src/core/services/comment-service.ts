import { Collection } from "mongodb";
import { AuthContext, Comment, CommentWithAuthor, createPersistedModel, Media, WithChildren, CreateMediaCommentArgs, UpdateMediaCommentArgs, User } from "../models.js";
import { rethrowIfAppError, createAppError, createResourceNotFoundError, createNotFoundError } from "../error.js";
import { ITransferService } from "./index.js";
import { Database } from "../db.js";
import { wrapError } from "../utils.js";

export interface MediaServiceConfig {
    transfers: ITransferService
}

export class CommentService {
    private collection: Collection<Comment>;

    constructor(private db: Database, private authContext: AuthContext) {
        this.collection = db.comments();
    }

    createMediaComment(media: Media, args: CreateMediaCommentArgs): Promise<WithChildren<CommentWithAuthor>> {
        return createMediaComment(
            this.db,
            media,
            args,
            this.authContext.user
        );
    }

    async getMediaComments(mediaId: string): Promise<WithChildren<CommentWithAuthor>[]> {
        try {
            const result = await this.collection.aggregate<WithChildren<CommentWithAuthor>>([
                {
                    $match: {
                        mediaId: mediaId,
                        deleted: { $ne: true },
                        $or: [
                            { parentId: null },
                            { parentId: { $exists: false } }
                        ]
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
                        from: this.collection.collectionName,
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
                                    from: this.db.users().collectionName,
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
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async deleteMediaComment(projectId: string, mediaId: string, commentId: string, isOwnerOrAdmin: boolean): Promise<void> {
        try {
            // if the user is a project owner or admin, then allow deleting
            // otherwise, allow deleting only if the user is the author
            const userAccessFilter = isOwnerOrAdmin ? {} : { '_createdBy._id': this.authContext.user._id };
            const result = await this.collection.updateOne(
                {
                    _id: commentId,
                    mediaId,
                    projectId,
                    deleted: { $ne: true },
                    ...userAccessFilter
                },
                {
                    $set: {
                        deleted: true,
                        deletedAt: new Date(),
                        deletedBy: { type: 'user', _id: this.authContext.user._id }
                    }
                }
            );

            if (result.modifiedCount == 0) {
                throw createNotFoundError('comment');
            }
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async updateMediaComment(projectId: string, mediaId: string, commentId: string, args: UpdateMediaCommentArgs): Promise<Comment> {
        try {
            const result = await this.collection.findOneAndUpdate({
                _id: commentId,
                projectId,
                mediaId,
                deleted: { $ne: true },
                '_createdBy._id': this.authContext.user._id
            }, {
                $set: {
                    text: args.text,
                    _updatedBy: { type: 'user', _id: this.authContext.user._id },
                    _updatedAt: new Date(),
                }
            }, {
                returnDocument: 'after'
            });

            if (!result.value) {
                throw createNotFoundError('comment');
            }

            return result.value;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type ICommentService = Pick<CommentService, 'createMediaComment'|'getMediaComments'|'deleteMediaComment'|'updateMediaComment'>;

interface CreateCommentArgs {
    projectId: string;
    mediaId: string;
    mediaVersionId: string;
    text: string;
    timestamp?: number;
    parentId?: string;
}

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
        parentId: args.parentId
    }, author);
}

async function createComment(db: Database, args: CreateCommentArgs, user: User): Promise<WithChildren<CommentWithAuthor>> {
    return wrapError(async () => {
        if (args.parentId) {
            await ensureCommentReplyValid(db, args);
        }

        const comment: Comment = {
            ...createPersistedModel(user._id),
            text: args.text,
            mediaId: args.mediaId,
            mediaVersionId: args.mediaVersionId,
            projectId: args.projectId,
            parentId: args.parentId
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