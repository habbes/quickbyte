import { Filter, FindOneAndUpdateOptions, FindOptions } from "mongodb";
import { AuthContext, Comment, createPersistedModel, Media, MediaVersion, UpdateMediaArgs, MediaVersionWithFile, MediaWithFileAndComments, CreateMediaCommentArgs, WithChildren, CommentWithAuthor, UpdateMediaCommentArgs, getFolderPath, splitFilePathAndName, Folder, CreateTransferFileResult, CreateTransferResult, DeletionCountResult, MoveMediaToFolderArgs, ProjectShare, executeTasksInBatches, User, WithThumbnail, TransferFile, getMediaType, UpdateMediaVersionsArgs } from "../models.js";
import { rethrowIfAppError, createAppError, createResourceNotFoundError, createInvalidAppStateError, createNotFoundError, AppError, createResourceConflictError, createValidationError, createPermissionError } from "../error.js";
import { getDownloadableFiles, getMediaFiles, IPlaybackPackagerProvider, IStorageHandlerProvider, ITransferService, PlaybackPackagerRegistry, StorageHandlerProvider } from "./index.js";
import { getMediaComments, ICommentService } from "./comment-service.js";
import { createFilterForDeleteableResource, Database, DbMedia, deleteNowBy, updateNowBy } from "../db.js";
import { IFolderService } from "./folder-service.js";
import { getFileDownloadUrl } from "./transfer-service.js";
import { ensure, wrapError } from "../utils.js";

export interface MediaServiceConfig {
    transfers: ITransferService;
    comments: ICommentService;
    folders: IFolderService
}

export class MediaService {

    constructor(private db: Database, private authContext: AuthContext, private config: MediaServiceConfig) {
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
            await this.db.media().insertMany(media);
            const folders = Array.from(pathToFolderMap.values());
            return { media, folders };
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getProjectMedia(projectId: string): Promise<Media[]> {
        try {
            const media = await this.db.media().find(
                addRequiredMediaFilters({ projectId: projectId }),
                addDefaultMediaFindOptions({})
            ).toArray();
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    getProjectMediaByFolder(projectId: string, folderId?: string): Promise<Media[]> {
        return getProjectMediaByFolder(this.db, projectId, folderId);
    }

    async getMediaById(projectId: string, id: string): Promise<MediaWithFileAndComments> {
        try {
            const medium = await this.db.media().findOne(
                addRequiredMediaFilters({ projectId: projectId, _id: id }),
                addDefaultMediaFindOptions({})
            );
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

            return { ...medium, file, versions: versionsWithFiles, comments, thumbnailUrl: file.thumbnailUrl }
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async updateMedia(projectId: string, id: string, args: UpdateMediaArgs): Promise<Media> {
        try {
            const result = await this.db.media().findOneAndUpdate(addRequiredMediaFilters({
                projectId: projectId,
                _id: id,
            }), {
                $set: {
                    name: args.name,
                    _updatedAt: new Date(),
                    _updatedBy: { type: 'user', _id: this.authContext.user._id }
                }
            }, {
                returnDocument: 'after',
                ...addDefaultMediaFindOptions({})
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
                }), 
                addDefaultMediaFindOptions({ session })
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
            const result = await this.db.media().updateMany(
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
            
            const medium = await this.db.media().findOne(
                addRequiredMediaFilters({ projectId: projectId, _id: mediaId }),
                addDefaultMediaFindOptions({})
            );
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

    updateMediaComment(args: UpdateMediaCommentArgs): Promise<Comment> {
        return this.config.comments.updateMediaComment(args);
    }

    async updateMediaVersions(args: UpdateMediaVersionsArgs, isAdminOrOwner: boolean) {
        // we use a optimistic concurrency for this operation
        // because of some of the operations on versions
        // that we can't do atomically, like re-ordering and deleting, the version
        // list.
        // But some operations, like updating the preferred version, might not
        // need this.
        // If this causes a bottleneck we can consider optimizing
        // such that we only trigger a transaction if we need to perform
        // an update that needs it, otherwise we use findOneAndUpdate
        // atomically.
        
        try {
            const conflictErrorMessage = 'Media asset or version may have been modified by a different user. Please reload and try again.';
            const query = addRequiredMediaFilters({
                _id: args.mediaId,
                projectId: args.projectId,
                _cc: args.concurrencyControl
            });

            if (args.preferredVersionId) {
                // if preferred version is set, make sure it exists
                query['versions._id'] = args.preferredVersionId
            }

            const media = await this.db.media().findOne(query, addDefaultMediaFindOptions({}));

            if (!media) {
                throw createResourceConflictError(conflictErrorMessage);
            }

            const update: Partial<DbMedia> = {
                _updatedAt: new Date(),
                _updatedBy: { _id: this.authContext.user._id, type: 'user' }
            };
            if (args.preferredVersionId) {
                update.preferredVersionId = args.preferredVersionId
            }

            if (args.versions) {
                const newVersions: MediaVersion[] = [];

                // this loop handles updates to the versions array,
                // including (implicitly) re-ordering and deletion.
                // This effectively performs a hard delete, deleting
                // the version from the db. And since we currently don't
                // have audit log. We're losing traces of the version.
                // The underlying file might remain orphaned.
                // We may still have media comments that are tied to this
                // version. Should we implement a soft delete instead?
                // That of course will introduce complexity of having to filter
                // out the versions in every query.
                for (const v of args.versions) {
                    const oldVersion = media.versions.find(other => other._id === v._id);
                    if (!oldVersion) {
                        // if we can't find a version it could be that the user has sent invalid versions
                        // or the the media in the db is different from the version the client has,
                        // despite the concurrency control being the same. This means
                        // two clients with the same version are trying to make an update concurrently.
                        // Let's consider this a conflict and fail.

                        console.warn(`Attempting to update version ${v._id} of media ${media._id} but the version does not exist. Possible conflict.`);

                        throw createResourceConflictError(conflictErrorMessage);
                    }

                    const newVersion = {
                        ...oldVersion,
                        name: v.name
                    };

                    if (newVersion.name !== oldVersion.name) {
                        newVersion._updatedAt = new Date();
                        newVersion._updatedBy = { _id: this.authContext.user._id, type: 'user' };
                    }

                    newVersions.push(newVersion);
                }

                const deletedVersions = media.versions.filter(old => !newVersions.some(newV => newV._id === old._id));

                for (const v of deletedVersions) {
                    // You can delete a version if
                    // - you're an admin or owner
                    // - you're the editor who originally uploaded the media item
                    // - you're the editor who uploaded the version

                    const canDeleteVersion = isAdminOrOwner || this.authContext.user._id === media._createdBy._id ||
                        this.authContext.user._id === v._createdBy._id;
                    
                    if (!canDeleteVersion) {
                        throw createPermissionError(`You do not have permissions to delete version '${v.name}'`);
                    }

                    v.deleted = true;
                    v.deletedAt = new Date();
                    v.deletedBy = { _id: this.authContext.user._id, type: 'user' };
                }

                const allDeletedVersions = (media._deletedVersions || []).concat(deletedVersions);
                update.versions = newVersions;
                update._deletedVersions = allDeletedVersions;
                
            }

            if (update.versions && !update.versions.length) {
                throw createValidationError("Cannot delete all versions. A media asset should have at least one version.");
            }

            if (update.versions && args.preferredVersionId) {
                if (!update.versions.some(v => v._id === args.preferredVersionId)) {
                    throw createValidationError("The selected preferred version is not one of the media asset's versions.");
                }
            }

            const result = await this.db.media().findOneAndUpdate(
                query
            , {
                $set: update,
                $inc: { _cc: 1 }
            }, 
                addDefaultMediaFindOptions<FindOneAndUpdateOptions>({ returnDocument: 'after' })
            );

            if (!result.value) {
                throw createResourceConflictError(conflictErrorMessage);
            }

            return result.value;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
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

            const result = await this.db.media().findOneAndUpdate(addRequiredMediaFilters({
                _id: mediaId
            }), {
                $push: { versions: { $each: newVersions } },
                $set: {
                    preferredVersionId: newPreferredVersionId,
                    _updatedAt: new Date(),
                    _updatedBy: { type: 'user', _id: this.authContext.user._id }
                },
            }, {
                ...addDefaultMediaFindOptions({}),
                returnDocument: 'after'
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

export function addRequiredMediaFilters(filter: Filter<DbMedia>): Filter<Media> {
    return { ...filter, deleted: { $ne: true }, parentDeleted: { $ne: true } }
}

export function addDefaultMediaFindOptions<TOptions extends FindOptions<DbMedia>>(options: TOptions): TOptions {
    return {
        ...options,
        projection: { _deletedVersions: 0 }
    };
}

export function getPlainMediaById(db: Database, projectId: string, id: string): Promise<Media> {
    return wrapError(async () => {
        const media = await db.media().findOne(
            addRequiredMediaFilters({
                projectId,
                _id: id
            }),
            addDefaultMediaFindOptions({})
        )

        if (!media) {
            throw createNotFoundError('media');
        }

        return media
    });
}

export function getMultipleMediaByIds(db: Database, projectId: string, ids: string[]): Promise<Media[]> {
    return wrapError(async () => {
        const media = await db.media().find(
            addRequiredMediaFilters({
                projectId,
                _id: { $in: ids }
            }),
            addDefaultMediaFindOptions({})
        ).toArray();

        return media
    });
}

export function getProjectMediaByFolder(
    db: Database,
    projectId: string,
    folderId?: string
): Promise<Media[]> {
    return wrapError(async () => {
        const query: Filter<Media> = addRequiredMediaFilters({
            projectId
        });

        if (folderId) {
            query.folderId = folderId;
        } else {
            query.folderId = null;
        }

        const media = await db.media().find(query, addDefaultMediaFindOptions({})).toArray();

        return media;
    });
}

export function getProjectShareMedia(
    db: Database,
    storageProviders: IStorageHandlerProvider,
    packagers: IPlaybackPackagerProvider,
    share: ProjectShare,
    folderId?: string
): Promise<MediaWithFileAndComments[]> {
    return wrapError(async () => {
        if (!share.items || share.allItems) {
            // TODO: support this feature.
            throw createAppError('Sharing all project items not currently supported');
        }
        const media = folderId?
            await getProjectMediaByFolder(db, share.projectId, folderId):
            await getMultipleMediaByIds(db, share.projectId, share.items.filter(i => i.type === 'media').map(i => i._id));

        const mediaWithFiles = executeTasksInBatches(
            media,
            medium => getProjectShareMediaFilesAndComments({
                db: db,
                storageProviders: storageProviders,
                packagers: packagers,
                share: share,
                medium: medium,
                // when fetching a list of media items we don't fetch
                // the playback urls because it might be expensive
                playable: false
            }),
            10
        );

        return mediaWithFiles;
    });
}

export async function getProjectShareMediaFilesAndComments({
    db,
    storageProviders,
    packagers,
    share,
    medium,
    playable,
    user
}: {
    db: Database,
    storageProviders: IStorageHandlerProvider,
    packagers: IPlaybackPackagerProvider,
    share: ProjectShare,
    medium: Media,
    user?: User,
    playable: boolean
}) {
    const versions = share.showAllVersions ? medium.versions : [ensure(medium.versions.find(v => v._id === medium.preferredVersionId))];

    const files = playable ?
        await getMediaFiles(versions.map(v => v.fileId), db, storageProviders, packagers) :
        await getDownloadableFiles(versions.map(v => v.fileId), db, storageProviders);
    if (!share.allowDownload) {
        // TODO: this is a quick hack. We should ideally not have the downloadUrl field if downloads are not allowed
        // I was just too lazy to refactor things
        for (const file of files) {
            file.downloadUrl = "";
        }
    }

    const versionsWithFiles = versions.map<MediaVersionWithFile>(v => {

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

    // If the share is being accessed by a user (fully registered or guest),
    // return their comments, otherwise return no comments. People using
    // a share link to access files can only see their comments or replies
    // to their comments.
    const comments = user ? await getMediaComments(db, medium._id, user._id) : [];

    return { ...medium, file, versions: versionsWithFiles, comments }
}


export async function addThumbnailUrlsToMedia<TMedia extends Media>(
    db: Database,
    storageProviders: IStorageHandlerProvider,
    packagers: IPlaybackPackagerProvider,
    media: TMedia[]
): Promise<WithThumbnail<TMedia>[]> {
    const mediaToFileMap = new Map<string, string>();
    const fileIds = [];
    for (let medium of media) {
        const version = medium.versions.find(v => v._id === medium.preferredVersionId);
        if (!version) {
            // TODO: emit warning, this an invalid state, but I don't think
            // it's worth throwing an error for, but definitely
            // something to investigate
            continue;
        }

        fileIds.push(version.fileId);
        mediaToFileMap.set(medium._id, version.fileId);
    }

    const files = await db.files().find({ _id: { $in: fileIds } }).toArray();
    const mediaWithThumbnails = await executeTasksInBatches(media, async (m) => {
        const fileId = mediaToFileMap.get(m._id);
        const file = files.find(f => f._id === fileId);
        if (!file) {
            return m;
        }

        const mediumWithThumb = await addThumbnailToMedia(storageProviders, packagers, m, file);
        return mediumWithThumb;
    }, 5);

    return mediaWithThumbnails;
}

export async function addThumbnailToMedia<TMedia extends Media>(
    storageProviders: IStorageHandlerProvider,
    packagers: IPlaybackPackagerProvider,
    media: TMedia,
    file: TransferFile
): Promise<WithThumbnail<TMedia>> {
    const mediaType = getMediaType(file.name);
    // if file has no packager, then we ignore
    if ((mediaType === 'video' || mediaType === 'image') && file.playbackPackagingProvider && file.playbackPackagingId) {
        const packager = packagers.getPackager(file.playbackPackagingProvider);

        const urls = await packager.getPlaybackUrls(file);
        if (urls.thumbnailUrl) {
            return {
                ...media,
                thumbnailUrl: urls.thumbnailUrl
            }
        } else if (urls.posterUrl) {
            return {
                ...media,
                thumbnailUrl: urls.posterUrl
            }
        }
    }
    else if (mediaType === 'image') {
        // if it's an image, we can fallback to providing the image download url,
        // note that the image would be costly to render
        const storage = storageProviders.getHandler(file.provider);

        const url = await getFileDownloadUrl(storage, file);

        return {
            ...media,
            thumbnailUrl: url
        }
    }

    return media;
}

export type IMediaService = Pick<MediaService, 'uploadMedia'|'getMediaById'|'getProjectMedia'| 'getProjectMediaByFolder'|'createMediaComment'|'updateMedia'|'deleteMedia'|'deleteMediaComment'|'updateMediaComment'|'moveMediaToFolder'|'updateMediaVersions'>;
