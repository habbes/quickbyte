import { Collection, Filter } from "mongodb";
import { AuthContext, Comment, createPersistedModel, Media, MediaVersion, UpdateMediaArgs, MediaVersionWithFile, MediaWithFileAndComments, CreateMediaCommentArgs, WithChildren, CommentWithAuthor, UpdateMediaCommentArgs, getFolderPath, splitFilePathAndName, Folder, CreateTransferFileResult, CreateTransferResult, DeletionCountResult, MoveMediaToFolderArgs } from "../models.js";
import { rethrowIfAppError, createAppError, createResourceNotFoundError, createInvalidAppStateError, createNotFoundError, AppError } from "../error.js";
import { ITransferService } from "./index.js";
import { ICommentService } from "./comment-service.js";
import { createFilterForDeleteableResource, Database, deleteNowBy, updateNowBy } from "../db.js";
import { IFolderService } from "./folder-service.js";
import { wrapError } from "../utils.js";

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

    async uploadMedia(transfer: CreateTransferResult): Promise<{ media: Media[], folders?: Folder[] }> {
        if (!transfer.projectId) {
            throw createInvalidAppStateError(`No project id for upload media transfer '${transfer._id}'`);
        }

        let files = transfer.files;
        try {

            if (transfer.mediaId) {
                const medium = await this.uploadMediaVersions(transfer.mediaId, transfer);
                return { media: [medium] };
            }

            let basePath = "";
            if (transfer.folderId) {
                try {
                    const parentFolder = await this.config.folders.getProjectFolderWithPath(transfer.projectId, transfer.folderId);
                    basePath = parentFolder.path.map(p => p.name).join("/");
                } catch (e: any) {
                    // it's possible the folderId no longer exists, maybe it was deleted
                    // in that case we ignore it and upload the files (to the project root)
                    // anyway. We do this because the user could run an upload in the background,
                    // we want to avoid unnecessarily causing the uploads to fail.
                    // Another approach would be to prefix the paths to the files on the client
                    // since folder segments
                    // would be re-created automatically if they get deleted in the mean time.
                    // The benefit of using the folderId is that if the folder is renamed between
                    // creating the transfer and the media files, the files will still land
                    // in the renamed folder
                    // The downside of setting paths on the client is that the client
                    // currently relies on path names matching those on the user's machine
                    // to correctly resume files. That could be fixed, but not a priority
                    // at the moment
                    if (!(e instanceof AppError) || e.code !== 'resourceNotFound') {
                        throw e;
                    }

                    // TODO: proper logging
                    console.warn(
                        `Target folder '${transfer.folderId} of transfer '${transfer._id}' does not exist. Files will be transfered to root of the project '${transfer.projectId}'.`
                    );
                }
            }

            if (basePath) {
                // replace file paths
                files = files.map(f => {
                    const newFile = { ...f };
                    const { folderPath, fileName } = splitFilePathAndName(f.name);
                    const newPath = folderPath ? `${basePath}/${folderPath}/${fileName}` : `${basePath}/${fileName}`;
                    newFile.name = newPath;
                    return newFile;
                });
            }

            // extract unique folder paths from files
            const folderPaths = new Set(
                files.map((f => getFolderPath(f.name))));
            folderPaths.delete("");
            // create folder hierarchy in db
            const pathToFolderMap = await this.config.folders.createFolderTree({
                projectId: transfer.projectId,
                paths: Array.from(folderPaths)
            });

            const media = files.map(file => this.convertFileToMedia(transfer.projectId!, file, pathToFolderMap));
            await this.collection.insertMany(media);
            const folders = Array.from(pathToFolderMap.values());
            return { media, folders };
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getProjectMedia(projectId: string): Promise<Media[]> {
        try {
            const media = await this.collection.find(addRequiredMediaFilters({ projectId: projectId })).toArray();
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getProjectMediaByFolder(projectId: string, folderId?: string): Promise<Media[]> {
        try {
            const query: Filter<Media> = addRequiredMediaFilters({
                projectId
            });

            if (folderId) {
                query.folderId = folderId;
            } else {
                query.folderId = null;
            }

            const media = await this.collection.find(query).toArray();
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getMediaById(projectId: string, id: string): Promise<MediaWithFileAndComments> {
        try {
            const medium = await this.collection.findOne(addRequiredMediaFilters({ projectId: projectId, _id: id }));
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
            const result = await this.collection.findOneAndUpdate(addRequiredMediaFilters({
                projectId: projectId,
                _id: id,
            }), {
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

    async moveMediaToFolder(args: MoveMediaToFolderArgs): Promise<Media[]> {
        const session = this.db.startSession();
        try {
            session.startTransaction();

            // ensure the target folder exists if provided
            // if not provided, move to project root
            let targetFolder: Folder|null = null;
            if (args.targetFolderId) {
                targetFolder = await this.db.folders().findOne(
                    createFilterForDeleteableResource({
                        _id: args.targetFolderId,
                        projectId: args.projectId
                    }),
                    {
                        session
                    }
                );

                if (!targetFolder) {
                    throw createResourceNotFoundError("The target folder does not exist.");
                }
            }

            const result = await this.db.media().updateMany(
                createFilterForDeleteableResource({
                    _id: { $in: args.mediaIds },
                    projectId: args.projectId
                }),
                {
                    $set: {
                        folderId: targetFolder ? targetFolder._id : undefined,
                        ...updateNowBy(this.authContext.user._id)
                    }
                }, {
                    session
                }
            );

            const updatedMedia = await this.db.media().find(
                createFilterForDeleteableResource({
                    _id: { $in: args.mediaIds },
                    projectId: args.projectId
                }), {
                    session
                }
            ).toArray();

            await session.commitTransaction();
            return updatedMedia;
        } catch (e: any) {
            await session.abortTransaction();
            rethrowIfAppError(e);
            throw createAppError(e);
        }
        finally {
            await session.endSession();
        }
    }

    async deleteMedia(projectId: string, mediaIds: string[], isOwnerOrAdmin: boolean): Promise<DeletionCountResult> {
        try {
            // if the user is a project owner or admin, then allow deleting
            // otherwise, allow deleting only if the user is the author
            const userAccessFilter = isOwnerOrAdmin ? {} : { '_createdBy._id': this.authContext.user._id };
            const result = await this.collection.updateMany(
                createFilterForDeleteableResource({
                    projectId,
                    _id: { $in: mediaIds },
                    ...userAccessFilter
                }), {
                    $set: deleteNowBy(this.authContext.user._id)
                }
            );

            return {
                deletedCount: result.modifiedCount
            }
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async createMediaComment(projectId: string, mediaId: string, args: CreateMediaCommentArgs): Promise<WithChildren<CommentWithAuthor>> {
        try {
            const medium = await this.collection.findOne(addRequiredMediaFilters({ projectId: projectId, _id: mediaId }));
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

            const result = await this.collection.findOneAndUpdate(addRequiredMediaFilters({
                _id: mediaId
            }), {
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

export function addRequiredMediaFilters(filter: Filter<Media>): Filter<Media> {
    return { ...filter, deleted: { $ne: true }, parentDeleted: { $ne: true } }
}

export function getMultipleMediaByIds(db: Database, projectId: string, ids: string[]): Promise<Media[]> {
    return wrapError(async () => {
        const media = await db.media().find(
            addRequiredMediaFilters({
                projectId,
                _id: { $in: ids }
            })
        ).toArray();

        return media
    });
}

export type IMediaService = Pick<MediaService, 'uploadMedia'|'getMediaById'|'getProjectMedia'| 'getProjectMediaByFolder'|'createMediaComment'|'updateMedia'|'deleteMedia'|'deleteMediaComment'|'updateMediaComment'|'moveMediaToFolder'>;
