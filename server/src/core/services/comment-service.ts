import { Collection } from "mongodb";
import { AuthContext, Comment, CommentWithAuthor, createPersistedModel, Media, WithChildren, CreateMediaCommentArgs } from "../models.js";
import { rethrowIfAppError, createAppError, createResourceNotFoundError, createValidationError, createNotFoundError } from "../error.js";
import { ITransferService } from "./index.js";
import { Database } from "../db.js";

export interface MediaServiceConfig {
    transfers: ITransferService
}

export class CommentService {
    private collection: Collection<Comment>;

    constructor(private db: Database, private authContext: AuthContext) {
        this.collection = db.comments();
    }

    async createMediaComment(media: Media, args: CreateMediaCommentArgs): Promise<WithChildren<CommentWithAuthor>> {
        const version = media.versions.find(v => v._id === args.mediaVersionId);
        if (!version) {
            throw createResourceNotFoundError(`The version '${args.mediaVersionId}' does not exist for the media '${media._id}'.`);
        }
    
        return this.create({
            mediaId: media._id,
            projectId: media.projectId,
            mediaVersionId: args.mediaVersionId,
            text: args.text,
            timestamp: args.timestamp,
            parentId: args.parentId
        });
    }

    private async create(args: CreateCommentArgs): Promise<WithChildren<CommentWithAuthor>> {
        try {
            if (args.parentId) {
                await this.ensurCommentReplyValid(args);
            }

            const comment: Comment = {
                ...createPersistedModel(this.authContext.user._id),
                text: args.text,
                mediaId: args.mediaId,
                mediaVersionId: args.mediaVersionId,
                projectId: args.projectId,
                parentId: args.parentId
            };

            if (args.timestamp !== undefined && args.timestamp !== null) {
                comment.timestamp = args.timestamp;
            }

            await this.collection.insertOne(comment);
            return {
                ...comment,
                author: {
                    _id: this.authContext.user._id,
                    name: this.authContext.user.name
                },
                children: []
            };
            
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private async ensurCommentReplyValid(args: CreateCommentArgs): Promise<void> {
        try {
            // the reply comment must apply to the same media as the parent,
            // but could be a different version
            const parent = await this.collection.findOne({
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
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
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
}

export type ICommentService = Pick<CommentService, 'createMediaComment'|'getMediaComments'|'deleteMediaComment'>;

interface CreateCommentArgs {
    projectId: string;
    mediaId: string;
    mediaVersionId: string;
    text: string;
    timestamp?: number;
    parentId?: string;
}
