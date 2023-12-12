import { Db, Collection } from "mongodb";
import { AuthContext, Comment, CommentWithAuthor, createPersistedModel, Media, MediaVersion } from "../models.js";
import { rethrowIfAppError, createAppError, createResourceNotFoundError, createInvalidAppStateError } from "../error.js";
import { CreateTransferFileResult, CreateTransferResult, DownloadTransferFileResult, ITransferService } from "./index.js";

const COLLECTION = 'comments';

export interface MediaServiceConfig {
    transfers: ITransferService
}

export class CommentService {
    private collection: Collection<Comment>;

    constructor(private db: Db, private authContext: AuthContext) {
        this.collection = db.collection<Comment>(COLLECTION);
    }

    async createMediaComment(media: Media, args: CreateMediaCommentArgs): Promise<CommentWithAuthor> {
        const version = media.versions.find(v => v._id === args.mediaVersionId);
        if (!version) {
            throw createResourceNotFoundError(`The version '${args.mediaVersionId}' does not exist for the media '${media._id}'.`);
        }
    
        return this.create({
            mediaId: media._id,
            projectId: media.projectId,
            mediaVersionId: args.mediaVersionId,
            text: args.text,
            timestamp: args.timestamp
        });
    }

    private async create(args: CreateCommentArgs): Promise<CommentWithAuthor> {
        try {
            const comment: Comment = {
                ...createPersistedModel(this.authContext.user._id),
                text: args.text,
                mediaId: args.mediaId,
                mediaVersionId: args.mediaVersionId,
                projectId: args.projectId
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
                }
            };
            
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getMediaComments(mediaId: string): Promise<CommentWithAuthor[]> {
        try {
            const result = await this.collection.aggregate<CommentWithAuthor>([
                {
                    $match: { mediaId: mediaId }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_createdBy._id',
                        foreignField: '_id',
                        as: 'author',
                        pipeline: [{ $limit: 1 }]
                    }
                },
                {
                    $unwind: {
                        path: '$author'
                    }
                }
            ]).toArray();;
            
            return result;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type ICommentService = Pick<CommentService, 'createMediaComment'|'getMediaComments'>;

interface CreateCommentArgs {
    projectId: string;
    mediaId: string;
    mediaVersionId: string;
    text: string;
    timestamp?: number;
}

export interface CreateMediaCommentArgs {
    mediaVersionId: string;
    text: string;
    timestamp?: number;
}