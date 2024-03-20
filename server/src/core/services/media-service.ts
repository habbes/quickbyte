import { Collection } from "mongodb";
import { AuthContext, Comment, createPersistedModel, Media, MediaVersion, UpdateMediaArgs, MediaVersionWithFile, MediaWithFileAndComments, CreateMediaCommentArgs, WithChildren, CommentWithAuthor, UpdateMediaCommentArgs, getFolderPath, Folder } from "../models.js";
import { rethrowIfAppError, createAppError, createResourceNotFoundError, createInvalidAppStateError, createNotFoundError } from "../error.js";
import { CreateTransferFileResult, CreateTransferResult, ITransferService } from "./index.js";
import { ICommentService } from "./comment-service.js";
import { Database } from "../db.js";
import { IFolderService } from "./folder-service.js";

export interface MediaServiceConfig {
    transfers: ITransferService;
    comments: ICommentService;
    folders: IFolderService
}

export class MediaService {
    private collection: Collection<Media>;

    constructor(private db: Database, private authContext: AuthContext, private config: MediaServiceConfig) {
        this.collection = db.media();
    }

    async uploadMedia(transfer: CreateTransferResult): Promise<Media[]> {
        if (!transfer.projectId) {
            throw createInvalidAppStateError(`No project id for upload media transfer '${transfer._id}'`);
        }

        const files = transfer.files;
        try {

            if (transfer.mediaId) {
                const medium = await this.uploadMediaVersions(transfer.mediaId, transfer);
                return [medium];
            }

            // extract unique folder paths from files
            const folderPaths = new Set(files.map((f => getFolderPath(f.name))));
            folderPaths.delete("");
            // create folder hierarchy in db
            const pathToFolderMap = await this.config.folders.createFolderTree({
                projectId: transfer.projectId,
                paths: Array.from(folderPaths)
            });

            const media = files.map(file => this.convertFileToMedia(transfer.projectId!, file, pathToFolderMap));
            await this.collection.insertMany(media);
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getProjectMedia(projectId: string): Promise<Media[]> {
        try {
            const media = await this.collection.find({ projectId: projectId, deleted: { $ne: true } }).toArray();
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getMediaById(projectId: string, id: string): Promise<MediaWithFileAndComments> {
        try {
            const medium = await this.collection.findOne({ projectId: projectId, _id: id, deleted: { $ne: true } });
            if (!medium) {
                throw createResourceNotFoundError();
            }

            const [files, comments] = await Promise.all([
                this.config.transfers.getMediaFiles(medium.versions.map(v => v.fileId)),
                this.config.comments.getMediaComments(medium._id)
            ]);

            const versionsWithFiles = medium.versions.map<MediaVersionWithFile>(v => {

                const file = files.find(f => f._id === v.fileId);
                if (!file) {
                    throw createInvalidAppStateError(`Could not find file '${v.fileId}' for version '${v._id}' of media '${medium._id}'`);
                }
                const version = {
                    ...v,
                    file
                }

                return version;
            });

            const preferredVersion = versionsWithFiles.find(v => v._id === medium.preferredVersionId);
            if (!preferredVersion) {
                throw createInvalidAppStateError(`Could not find preferred verson '${medium.preferredVersionId}' for media '${medium._id}'`);
            }

            const file = preferredVersion.file;

            return { ...medium, file, versions: versionsWithFiles, comments }
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async updateMedia(projectId: string, id: string, args: UpdateMediaArgs): Promise<Media> {
        try {
            const result = await this.collection.findOneAndUpdate({
                projectId: projectId,
                _id: id,
                deleted: { $ne: true },

            }, {
                $set: {
                    name: args.name,
                    _updatedAt: new Date(),
                    _updatedBy: { type: 'user', _id: this.authContext.user._id }
                }
            }, {
                returnDocument: 'after'
            });

            if (!result.value) {
                throw createResourceNotFoundError();
            }

            return result.value;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async deleteMedia(projectId: string, id: string, isOwnerOrAdmin: boolean): Promise<void> {
        try {
            // if the user is a project owner or admin, then allow deleting
            // otherwise, allow deleting only if the user is the author
            const userAccessFilter = isOwnerOrAdmin ? {} : { '_createdBy._id': this.authContext.user._id };
            const result = await this.collection.findOneAndUpdate({
                projectId,
                _id: id,
                deleted: { $ne: true },
                ...userAccessFilter
            }, {
                $set: {
                    deleted: true,
                    deletedAt: new Date(),
                    deletedBy: { _id: this.authContext.user._id, type: 'user' }
                }
            });

            if (!result.value) {
                throw createResourceNotFoundError();
            }
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async createMediaComment(projectId: string, mediaId: string, args: CreateMediaCommentArgs): Promise<WithChildren<CommentWithAuthor>> {
        try {
            const medium = await this.collection.findOne({ projectId: projectId, _id: mediaId, deleted: { $ne: true } });
            if (!medium) {
                throw createNotFoundError('media');
            }

            const comment = await this.config.comments.createMediaComment(medium, args);

            return comment;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    deleteMediaComment(projectId: string, mediaId: string, commentId: string, isOwnerOrAdmin: boolean): Promise<void> {
        return this.config.comments.deleteMediaComment(projectId, mediaId, commentId, isOwnerOrAdmin);
    }

    updateMediaComment(projectId: string, mediaId: string, commentId: string, args: UpdateMediaCommentArgs): Promise<Comment> {
        return this.config.comments.updateMediaComment(projectId, mediaId, commentId, args);
    }

    private convertFileToMedia(projectId: string, file: CreateTransferFileResult, pathToFolderMap: Map<string, Folder>) {
        const initialVersion: MediaVersion = this.convertFileToMediaVersion(file);

        const media: Media = {
            ...createPersistedModel(this.authContext.user._id),
            preferredVersionId: initialVersion._id,
            versions: [initialVersion],
            name: initialVersion.name,
            projectId: projectId
        }

        const folderPath = getFolderPath(file.name);
        const folder = pathToFolderMap.get(folderPath);
        if (folder) {
            media.folderId = folder._id;
        }

        return media;
    }

    private async uploadMediaVersions(mediaId: string, transfer: CreateTransferResult): Promise<Media> {
        try {
            const newVersions: MediaVersion[] = transfer.files.map(f => this.convertFileToMediaVersion(f));
            
            const newPreferredVersionId = newVersions[0]._id;

            const result = await this.collection.findOneAndUpdate({
                _id: mediaId, deleted: { $ne: true }
            }, {
                $push: { versions: { $each: newVersions } },
                $set: {
                    preferredVersionId: newPreferredVersionId,
                    _updatedAt: new Date(),
                    _updatedBy: { type: 'user', _id: this.authContext.user._id }
                }
            });

            if (!result.value) {
                throw createNotFoundError('media');
            }

            return result.value;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private convertFileToMediaVersion(file: CreateTransferFileResult): MediaVersion {
        return {
            ...createPersistedModel(this.authContext.user._id),
            fileId: file._id,
            // TODO: handle folder paths later
            name: file.name.split('/').at(-1)!
        };
    }
}

export type IMediaService = Pick<MediaService, 'uploadMedia'|'getMediaById'|'getProjectMedia'|'createMediaComment'|'updateMedia'|'deleteMedia'|'deleteMediaComment'|'updateMediaComment'>;
