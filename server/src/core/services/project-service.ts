import { Collection } from "mongodb";
import { AuthContext, Comment, Media, Project, RoleType, WithRole, ProjectMember, createPersistedModel, UpdateMediaArgs, ProjectItemType } from "../models.js";
import { rethrowIfAppError, createAppError, createSubscriptionRequiredError, createResourceNotFoundError, createInvalidAppStateError, createNotFoundError, createOperationNotSupportedError, createAuthError, createPermissionError } from "../error.js";
import { EmailHandler, EventDispatcher, IPlaybackPackagerProvider, IStorageHandlerProvider, ITransactionService, ITransferService, createMediaCommentNotificationEmail, getDownloadableFiles, getUserByEmail, getUserByEmailOrCreateGuest, tryGetUserByEmail } from "./index.js";
import { LinkGenerator, CreateProjectMediaUploadArgs, MediaWithFileAndComments, CreateMediaCommentArgs, CommentWithAuthor, WithChildren, UpdateMediaCommentArgs, UpdateProjectArgs, ChangeProjectMemmberRoleArgs, RemoveProjectMemberArgs, ProjectItem, GetProjectItemsArgs, UpdateFolderArgs, Folder, CreateFolderArgs, GetProjectItemsResult, FolderWithPath, UploadMediaResult, SearchProjectFolderArgs, DeleteProjectItemsArgs, DeletionCountResult, MoveProjectItemsToFolderArgs, CreateProjectShareArgs, ProjectShare, UpdateProjectShareArgs, DeleteProjectShareArgs, WithCreator, GetProjectShareLinkItemsArgs, GetProjectShareLinkItemsResult, ProjectShareItem, FolderPathEntry, CreateProjectShareMediaCommentArgs, DeleteProjectShareMediaCommentArgs, UpdateProjectShareMediaCommentArgs, GetProjectShareMediaByIdArgs, GetAllProjectShareFilesForDownloadArgs, ConcurrentTaskQueue, DownloadTransferFileResult, TaskTracker, GetAllProjectShareFilesForDownloadResult, UpdateMediaVersionsArgs, WithThumbnail } from '@quickbyte/common';
import { IInviteService } from "./invite-service.js";
import { addThumbnailUrlsToMedia, getMultipleMediaByIds, getPlainMediaById, getProjectMediaByFolder, getProjectShareMedia, getProjectShareMediaFilesAndComments, IMediaService  } from "./media-service.js";
import { IAccessHandler } from "./access-handler.js";
import { createFilterForDeleteableResource, Database } from "../db.js";
import { getProjectMembers } from "../db/helpers.js";
import { getFoldersByParent, getMultipleProjectFoldersByIds, getProjectFolderById, getProjectFolderWithPath, IFolderService } from "./folder-service.js";
import { wrapError } from "../utils.js";
import { getProjectShareByCode, IProjectShareService } from "./project-share-service.js";
import { createMediaComment, deleteMediaComment, updateMediaComment } from "./comment-service.js";

export interface ProjectServiceConfig {
    transactions: ITransactionService;
    transfers: ITransferService;
    media: IMediaService;
    folders: IFolderService;
    invites: IInviteService;
    access: IAccessHandler;
    links: LinkGenerator;
    email: EmailHandler;
    eventBus: EventDispatcher;
    projectShares: IProjectShareService;
    storageHandlers: IStorageHandlerProvider;
    packagers: IPlaybackPackagerProvider;
}

export class ProjectService {
    private collection: Collection<Project>;

    constructor(private db: Database, private authContext: AuthContext, private config: ProjectServiceConfig ) {
        this.collection = db.projects();
    }

    async createProject(args: CreateProjectArgs): Promise<WithRole<Project>> {
        try {
            const sub = await this.config.transactions.tryGetActiveSubscription(this.authContext.user.account._id);
            if (!sub) {
                throw createSubscriptionRequiredError();
            }

            // we don't limit number of projects in a subscription

            const project: Project = {
                ...createPersistedModel(this.authContext.user._id),
                accountId: this.authContext.user.account._id,
                name: args.name,
                description: args.description
            };

            await this.collection.insertOne(project);

            return { ...project, role: 'owner' };
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e); 
        }
    }

    async getByAccount(accountId: string): Promise<Project[]> {
        try {
            const projects = await this.collection.find(
                createFilterForDeleteableResource({ accountId })
            ).toArray();
            return projects;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getById(id: string): Promise<Project> {
        const project = await this.getByIdInternal(id);
        await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor', 'reviewer']);
        return project;
    }

    async updateProject(id: string, args: UpdateProjectArgs) {
        try {
            const project = await this.getByIdInternal(id);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin']);
            const update = await this.collection.findOneAndUpdate({
                _id: id
            }, {
                $set: {
                    name: args.name
                }
            }, {
                returnDocument: 'after'
            });

            if (update.value) {
                return update.value;
            }

            throw createAppError(`Failed to update project '${id}': ${update.lastErrorObject}`);
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    deleteProject(id: string) {
        return wrapError(async () => {
            const project = await this.getByIdInternal(id);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner']);
            // soft delete.
            // TODO: a background service should clean up projects and all its items
            await this.db.projects().updateOne({
                _id: project._id
            }, {
                $set: {
                    deleted: true,
                    deletedAt: new Date(),
                    deletedBy: { type: 'user', _id: this.authContext.user._id }
                }
            });
        });
    }

    async uploadMedia(id: string, args: CreateProjectMediaUploadArgs): Promise<UploadMediaResult> {
        try {
            const project = await this.getByIdInternal(id);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['admin', 'editor']);
            const transfer = await this.config.transfers.createProjectMediaUpload(project, args);
            const { media, folders } = await this.config.media.uploadMedia(transfer);

            return {
                media,
                folders,
                transfer
            };
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getMedia(id: string): Promise<Media[]> {
        try {
            const project = await this.getByIdInternal(id);
            // TODO should a reviewer have access to all project media or just select files?
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor', 'reviewer']);
            const media = await this.config.media.getProjectMedia(id);
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getItems(id: string, args: GetProjectItemsArgs): Promise<GetProjectItemsResult> {
        try {
            const project = await this.getByIdInternal(id);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor', 'reviewer']);

            const mediaWithoutThumbnails = await this.config.media.getProjectMediaByFolder(id, args.folderId);
            const media = await addThumbnailUrlsToMedia(this.db, this.config.storageHandlers, this.config.packagers, mediaWithoutThumbnails);
            const folders = await this.config.folders.getFoldersByParent(id, args.folderId);

            let folder: FolderWithPath|undefined = undefined;
            if (args.folderId) {
                folder = await this.config.folders.getProjectFolderWithPath(id, args.folderId);
            }

            const items: ProjectItem[] = [
                ...folders.map<ProjectItem>(f => ({
                    _id: f._id,
                    name: f.name,
                    type: 'folder',
                    _createdAt: f._createdAt,
                    _updatedAt: f._updatedAt,
                    item: f
                })),
                ...media.map<ProjectItem>(m => ({
                    _id: m._id,
                    name: m.name,
                    type: 'media',
                    _createdAt: m._createdAt,
                    _updatedAt: m._updatedAt,
                    item: m
                })),
            ];

            return {
                folder,
                items
            }
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getMediumById(projectId: string, id: string): Promise<MediaWithFileAndComments> {
        try {
            const project = await this.getByIdInternal(projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor', 'reviewer']);
            const media = await this.config.media.getMediaById(projectId, id);
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async updateMedia(id: string, args: UpdateMediaArgs): Promise<Media> {
        try {
            const project = await this.getByIdInternal(id);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner','admin', 'editor']);

            const media = await this.config.media.updateMedia(id, args.id, args);
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async createFolder(projectId: string, args: CreateFolderArgs): Promise<Folder> {
        try {
            const project = await this.getByIdInternal(projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor']);

            const folder = await this.config.folders.createFolder(args);
            return folder;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async updateFolder(projectId: string, args: UpdateFolderArgs): Promise<Folder> {
        try {
            const project = await this.getByIdInternal(projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner','admin', 'editor']);

            const folder = await this.config.folders.updateFolder(args);
            return folder;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async moveProjectItemsToFolder(args: MoveProjectItemsToFolderArgs): Promise<ProjectItem[]> {
        try {
            const project = await this.getByIdInternal(args.projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor']);

            const folderIds = args.items.filter(item => item.type === 'folder').map(item => item.id);
            const mediaIds = args.items.filter(item => item.type === 'media').map(item => item.id);

            const [folders, media] = await Promise.all([
                this.config.folders.moveFolders({
                    projectId: args.projectId,
                    folderIds,
                    targetFolderId: args.targetFolderId
                }),
                this.config.media.moveMediaToFolder({
                    projectId: args.projectId,
                    mediaIds,
                    targetFolderId: args.targetFolderId
                })
            ]);

            const mediaWithThumbnails = await addThumbnailUrlsToMedia(
                this.db,
                this.config.storageHandlers,
                this.config.packagers,
                media
            );
            
            const result = [
                ...folders.map<ProjectItem>(f => ({
                    _id: f._id,
                    name: f.name,
                    item: f,
                    type: 'folder',
                    _createdAt: f._createdAt,
                    _updatedAt: f._updatedAt
                })),
                ...mediaWithThumbnails.map<ProjectItem>(m => ({
                    _id: m._id,
                    name: m.name,
                    item: m,
                    type: 'media',
                    _createdAt: m._createdAt,
                    _updatedAt: m._updatedAt
                }))
            ];

            return result;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async deleteProjectItems(args: DeleteProjectItemsArgs): Promise<DeletionCountResult> {
        try {
            const project = await this.getByIdInternal(args.projectId);
            const role = await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor']);
            // admin or owner can delete any media or folder
            // editor can delete only media they created, but cannot delete folders
            // (because folders might contain media created by others)
            // for editors, we'll do the actual access verification in the called `deleteMultipleMedia` method
            const isAdminOrOwner = role === 'admin' || role === 'owner';

            const items = args.items;
            const folderIds = items.filter(i => i.type === 'folder').map(i => i.id);
            const mediaIds = items.filter(i => i.type === 'media').map(i => i.id);

            const [folderResult, mediaResult] = await Promise.all([
                isAdminOrOwner?
                    this.config.folders.deleteFolders(args.projectId, folderIds)
                    : Promise.resolve({ deletedCount: 0 }),
                this.config.media.deleteMedia(args.projectId, mediaIds, isAdminOrOwner)
            ]);

            const result = {
                deletedCount: folderResult.deletedCount + mediaResult.deletedCount
            };

            if (folderResult.deletedCount > 0) {
                // we're not sure of all input folders were
                // actually deleted. It's the responsibility
                // of the event handler to check the status
                // of the provided folder id before processing
                for (let folderId of folderIds) {
                    this.config.eventBus.send({
                        type: 'folderDeleted',
                        data: {
                            folderId,
                            projectId: args.projectId
                        }
                    })
                }
            }

            return result;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async searchProjectFolders(args: SearchProjectFolderArgs): Promise<FolderWithPath[]> {
        try {
            const project = await this.getByIdInternal(args.projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor', 'reviewer']);

            const result = await this.config.folders.searchProjectFolders(args);
            return result;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async createMediaComment(projectId: string, mediaId: string, args: CreateMediaCommentArgs): Promise<WithChildren<CommentWithAuthor>> {
        try {
            const project = await this.getByIdInternal(projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor', 'reviewer']);
            
            const user = this.authContext.user;
            const comment = await this.config.media.createMediaComment(projectId, mediaId, args);
            // TODO: email should be done in the background
            const members = await this.getMembersInternal(project);
            const otherMembers = members.filter(m => m._id !== this.authContext.user._id);
            const emailTasks = otherMembers.map(member => {
                this.config.email.sendEmail({
                    subject: `${user.name} commented in project ${project.name}`,
                    to: { name: member.name, email: member.email },
                    message: createMediaCommentNotificationEmail({
                        authorName: user.name,
                        recipientName: member.name,
                        projectName: project.name,
                        commentText: comment.text,
                        url: this.config.links.getMediaCommentUrl(projectId, mediaId, comment._id, comment.mediaVersionId)
                    })
                })
            });
            await Promise.all(emailTasks);
            return comment;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async deleteMediaComment(projectId: string, mediaId: string, commentId: string): Promise<void> {
        try {
            
            const project = await this.getByIdInternal(projectId);
            // The following check ensures that someone may not delete a comment they created when
            // they are not longer part of a project
            const role = await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor', 'reviewer']);
            // admin, owner or author can delete comment
            // we'll do the actual access verification in the called method
            const isAdminOrOwner = role === 'admin' || role === 'owner';
            await this.config.media.deleteMediaComment(projectId, mediaId, commentId, isAdminOrOwner);
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async updateMediaComment(projectId: string, mediaId: string, commentId: string, args: UpdateMediaCommentArgs): Promise<Comment> {
        try {
            // the called method ensures that only the author can delete the comment.
            // so the check for project access were do here is potentially unnecessary. But it's possible
            // that the user has been removed from the project, in which case this check prevents
            // them from editing a comment they created when they're not longer part of the project.
            const project = await this.getByIdInternal(projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor', 'reviewer'])
            const result = await this.config.media.updateMediaComment(args);
            return result;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    updateMediaVersions(args: UpdateMediaVersionsArgs): Promise<WithThumbnail<Media>> {
        return wrapError(async () => {
            const project = await this.getByIdInternal(args.projectId);
            const role = await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor']);
            const result = await this.config.media.updateMediaVersions(args, role === 'admin' || role === 'owner');
            const [resultWithThumbnail] = await addThumbnailUrlsToMedia(this.db, this.config.storageHandlers, this.config.packagers, [result]);
            return resultWithThumbnail;
        });
    }

    async inviteUsers(id: string, args: InviteUserArgs): Promise<void> {
        try {
            const project = await this.getByIdInternal(id);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin']);
            
            const invites = args.users.map(user => this.config.invites.createInvite({
                email: user.email,
                resource: {
                    type: 'project',
                    id: project._id,
                    name: project.name
                },
                invitor: this.authContext.user,
                role: args.role
            }));

            // we don't send the invite details back to the user
            await Promise.all(invites);

        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getMembers(id: string): Promise<ProjectMember[]> {
        try {
            const project = await this.getByIdInternal(id);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor']);
            
            const members = getProjectMembers(this.db, project);

            return members;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async changeMemberRole(id: string, args: ChangeProjectMemmberRoleArgs): Promise<void> {
        try {
            const project = await this.getByIdInternal(id);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin']);
            // ensure user exists
            const user = await this.db.users().findOne({ _id: args.userId });
            if (!user) {
                throw createNotFoundError("user");
            }

            // User cannot change their own role
            if (args.userId === this.authContext.user._id) {
                throw createOperationNotSupportedError("You cannot change your own role.");
            }

            // We currently do not support changing the owner's permissions.
            if (args.userId === project._createdBy._id) {
                throw createOperationNotSupportedError("You cannot change the role of the project owner.");
            }
            
            await this.config.access.assignRole(
                { type: 'user', _id: this.authContext.user._id },
                args.userId,
                'project',
                project._id,
                args.role
            );
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async removeMember(projectId: string, args: RemoveProjectMemberArgs): Promise<void> {
        try {
            const project = await this.getByIdInternal(projectId); 
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin']);
            
            // ensure user exists
            const user = await this.db.users().findOne({ _id: args.userId });
            if (!user) {
                throw createNotFoundError("user");
            }

            // You cannot remove the owner
            if (user._id === project._createdBy._id) {
                throw createOperationNotSupportedError("You cannot remove the project owner.");
            }

            if (user._id === this.authContext.user._id) {
                // TODO: this error message is confusing
                throw createOperationNotSupportedError("You cannot remove yourself from the project. Consider leaving the project instead.");
            }

            await this.config.access.removeAccess(user._id, 'project', project._id);
            this.config.eventBus.send({
                type: 'projectMemberRemoved',
                data: {
                    projectId: project._id,
                    memberId: user._id
                }
            });
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    createProjectShare(args: CreateProjectShareArgs): Promise<ProjectShare> {
        return wrapError(async () => {
            const project = await this.getByIdInternal(args.projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['admin', 'owner']);

            const share = await this.config.projectShares.createProjectShare(args);
            return share;
        })
    }

    getProjectShares(projectId: string): Promise<WithCreator<ProjectShare>[]> {
        return wrapError(async () => {
            const project = await this.getByIdInternal(projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['admin', 'owner']);

            const shares = await this.config.projectShares.listByProject(projectId);
            return shares;
        })
    }

    updateProjectShare(args: UpdateProjectShareArgs): Promise<ProjectShare> {
        return wrapError(async () => {
            const project = await this.getByIdInternal(args.projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['admin', 'owner']);

            const share = await this.config.projectShares.updateProjectShare(args);
            return share;
        });
    }

    deleteProjectShare(args: DeleteProjectShareArgs): Promise<void> {
        return wrapError(async () => {
            const project = await this.getByIdInternal(args.projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['admin', 'owner']);

            await this.config.projectShares.deleteProjectShare(args);
        });
    }

    private async getByIdInternal(id: string): Promise<Project> {
        try {
            const project = await this.collection.findOne(
                createFilterForDeleteableResource({ _id: id })
            );
            if (!project) {
                throw createNotFoundError('project');
            }

            return project;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    // TODO: delete this if notifications work without issue
    /**
     * 
     * @param project
     * @deprecated use "getProjectMembers" from the db module
     */
    private async getMembersInternal(project: Project): Promise<ProjectMember[]> {
        try {
            const id = project._id;
            const ownerTask = this.db.users().findOne({ _id: project._createdBy._id });
            const otherUsersTask = this.collection.aggregate<ProjectMember>([
                {
                    $match: {
                        _id: id
                    }
                },
                {
                    $lookup: {
                        from: this.db.roles().collectionName,
                        localField: '_id',
                        foreignField: 'resourceId',
                        as: 'roles',
                        pipeline: [
                            {
                                $match: {
                                    resourceType: 'project'
                                }
                            },
                            {
                                $lookup: {
                                    from: this.db.users().collectionName,
                                    localField: 'userId',
                                    foreignField: '_id',
                                    as: 'user'
                                }
                            },
                            {
                                $unwind: '$user'
                            },
                            {
                                $project: {
                                    _id: '$user._id',
                                    name: '$user.name',
                                    email: '$user.email',
                                    joinedAt: '$_createdAt',
                                    role: '$role'
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: '$roles'
                },
                {
                    $replaceRoot: {
                        newRoot: '$roles'
                    }
                }
            ]).toArray();

            const [owner, otherUsers] = await Promise.all([ownerTask, otherUsersTask]);

            if (!owner) {
                throw createInvalidAppStateError(`Owner '${project._createdBy._id}' of project '${project._id}' expected to exist but not found.`);
            }

            return [
                {
                    _id: owner._id,
                    name: owner.name,
                    email: owner.email,
                    joinedAt: project._createdAt,
                    role: 'owner'
                },
                ...otherUsers
            ];
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type IProjectService = ProjectService;

export interface CreateProjectArgs {
    name: string;
    description: string;
}

export interface InviteUserArgs {
    users: { email: string }[];
    message?: string;
    role: RoleType;
}

export interface PublicProjectServiceConfig {
    packagers: IPlaybackPackagerProvider;
    storageHandlers: IStorageHandlerProvider;
}

export class PublicProjectService {
    constructor(private db: Database, private config: PublicProjectServiceConfig) {
    }

    getProjectShareItems(args: GetProjectShareLinkItemsArgs): Promise<GetProjectShareLinkItemsResult> {
        return wrapError(async () => {
            const projectShareResult = await getProjectShareByCode(this.db, args);
            if ('passwordRequired' in projectShareResult) {
                return projectShareResult;
            }

            const share = projectShareResult;
            const project = await this.db.projects().findOne({ _id: share.projectId });
            if (!project) {
                throw createNotFoundError('project');
            }
            
            // get project media
            // should we fetch all the files at once, include download and play links (could be a long request),
            // -- pros: get all data in single request, simplifies client-side playback, navigation and download
            // -- cons: request can take long time if shared items are many or deeply nested, request can take
            // or fetch the files lazily expecting subsequent API calls to play or download the files?
            // -- pros: requests will be relatively quick and scalable for most scenarios
            // -- cons: navigation, playback and download will require follow up API calls, how will "Download all" be implemented
            // -- cons: more endpoints to be implemented backend

            if (share.allItems) {
                // TODO: support this feature
                throw createAppError("Fetching all project items is currently not supported");
            }

            
            let resultPath: FolderPathEntry[] = [];
            
            
            let media: MediaWithFileAndComments[] = [];
            let folders: Folder[] = [];

            if (!args.folderId) {
                // if no folder is specified, get all items directly shared from the share
                const sharedFolders = share.items?.filter(i => i.type === 'folder')!;
                media = await getProjectShareMedia(this.db, this.config.storageHandlers, this.config.packagers, share);
                folders = await getMultipleProjectFoldersByIds(this.db, share.projectId, sharedFolders.map(i => i._id));
            }
            else {
                // if folder is specified, we have to check if the folder is among the shared folders
                // or a subfolder of a shared folder
                const folder = await this.getSharedFolderOrSubFolder(args.folderId, share);
                media = await getProjectShareMedia(this.db, this.config.storageHandlers, this.config.packagers, share, folder._id);
                folders = await getFoldersByParent(this.db, share.projectId, folder._id);
                resultPath = folder.path;
            }

            const mediaWithThumbnails = await addThumbnailUrlsToMedia(
                this.db,
                this.config.storageHandlers,
                this.config.packagers,
                media
            );

            const items: ProjectShareItem[] = [
                ...folders.map<ProjectShareItem>(f => ({
                    _id: f._id,
                    name: f.name,
                    type: 'folder',
                    _createdAt: f._createdAt,
                    _updatedAt: f._updatedAt,
                    item: f
                })),
                ...mediaWithThumbnails.map<ProjectShareItem>(m => ({
                    _id: m._id,
                    name: m.name,
                    type: 'media',
                    _createdAt: m._createdAt,
                    _updatedAt: m._updatedAt,
                    item: m
                })),
            ];

            return {
                _id: share._id,
                name: share.name,
                sharedEmail: share.sharedEmail,
                allowDownload: !!share.allowDownload,
                allowComments: !!share.allowComments,
                showAllVersions: !!share.showAllVersions,
                path: resultPath,
                items: items,
                sharedBy: share.creator
            }
        });
    }

    getProjectShareMediaById(args: GetProjectShareMediaByIdArgs): Promise<MediaWithFileAndComments> {
        return wrapError(async () => {
            const share = await this.getAndValidateProjectShare({
                shareId: args.shareId,
                shareCode: args.shareCode,
                password: args.password
            });

            const user = share.sharedEmail ? await tryGetUserByEmail(this.db, share.sharedEmail) : undefined;

            const plainMedia = await this.getProjectShareMediaByIdInternal(share, args.mediaId);
            const media = await getProjectShareMediaFilesAndComments({
                db: this.db,
                storageProviders: this.config.storageHandlers,
                packagers: this.config.packagers,
                share,
                medium: plainMedia,
                user: user,
                playable: true
            });

            return media
        });
    }

    createProjectShareMediaComment(args: CreateProjectShareMediaCommentArgs): Promise<CommentWithAuthor> {
        return wrapError(async () => {
            const share = await this.getAndValidateProjectShareForComments(args);

            // find media if it's shared or in a shared folder
            const media = await this.getProjectShareMediaByIdInternal(share, args.mediaId);

            // find user by email
            const user = await getUserByEmailOrCreateGuest(this.db, {
                email: share.sharedEmail!,
                name: args.authorName || share.sharedEmail!.split('@')[0],
                invitedBy: share._createdBy
            });

            const comment = await createMediaComment(
                this.db,
                media,
                {
                    mediaId: args.mediaId,
                    projectId: share.projectId,
                    mediaVersionId: args.mediaVersionId,
                    text: args.text,
                    timestamp: args.timestamp,
                    parentId: args.parentId,
                    annotations: args.annotations
                },
                user
            );

            return comment;
        });
    }

    deleteProjectShareMediaComment(args: DeleteProjectShareMediaCommentArgs): Promise<void> {
        return wrapError(async () => {
            const share = await this.getAndValidateProjectShareForComments(args);

            // find media if it's shared or in a shared folder
            const media = await this.getProjectShareMediaByIdInternal(share, args.mediaId);

            // find user by email
            const user = await getUserByEmail(this.db, share.sharedEmail!);
            await deleteMediaComment(
                this.db, {
                    mediaId: media._id,
                    projectId: share.projectId,
                    commentId: args.commentId,
                    isOwnerOrAdmin: false, // user should only be able to delete comment if they created it
                    user: user
                }
            );
        });
    }

    updateProjectShareMediaComment(args: UpdateProjectShareMediaCommentArgs): Promise<Comment> {
        return wrapError(async () => {
            const share = await this.getAndValidateProjectShareForComments(args);
            // find media if it's shared or in a shared folder
            const media = await this.getProjectShareMediaByIdInternal(share, args.mediaId);

            const user = await getUserByEmail(this.db, share.sharedEmail!);
            const comment = await updateMediaComment(
                this.db, {
                    commentId: args.commentId,
                    mediaId: media._id,
                    text: args.text,
                    projectId: share.projectId
                },
                user
            );

            return comment;
        });
    }

    getAllProjectShareFilesForDownload(args: GetAllProjectShareFilesForDownloadArgs): Promise<GetAllProjectShareFilesForDownloadResult> {
        return wrapError(async () => {
            const share = await this.getAndValidateProjectShare({
                shareId: args.shareId,
                shareCode: args.shareCode,
                password: args.password
            });

            if (!share.allowDownload) {
                throw createPermissionError('This link does not allow downloads.');
            }

            if (!share.items || !share.items.length) {
                // TODO: support for "share.allItems"
                throw createAppError("Downloading all project items is currently not supported");
            }

            const downloadProcessor = new GetProjectShareAllDownloadFilesRetriever(
                share,
                this.db,
                this.config.storageHandlers
            );

            const result = await downloadProcessor.run();

            return result;
        });
    }

    private async getAndValidateProjectShare(args: {
        shareId: string;
        shareCode: string;
        password?: string;
    }) {
        const share = await getProjectShareByCode(this.db, {
            code: args.shareCode,
            shareId: args.shareId,
            password: args.password
        });

        if ('passwordRequired' in share) {
            throw createAuthError('Password required');
        }

        return share;
    }

    private async getAndValidateProjectShareForComments(args: {
        shareId: string;
        shareCode: string;
        password?: string;
    }) {
        const share = await this.getAndValidateProjectShare(args);

        if (!share.sharedEmail) {
            throw createAuthError("Not authorized to post a comment");
        }

        if (!share.allowComments) {
            throw createPermissionError("Comments are not allowed.");
        }

        return share;
    }

    private getProjectShareMediaByIdInternal(share: ProjectShare, mediaId: string) {
        return wrapError(async () => {
            const media = await getPlainMediaById(this.db, share.projectId, mediaId);
            // verify that share has access to this media
            if (!share.items?.find(i => i.type === 'media' && i._id === media._id)) {
                // media not directly shared, let's see if the media is inside
                // a shared folder or a subfolder of a shared folder
                const folderId = media.folderId;
                if (!folderId) {
                    throw createNotFoundError('media');
                }

                // this will throw an error if the folder is not on a shared path
                await this.getSharedFolderOrSubFolder(folderId, share);
            }

            return media;
        });
    }

    private async getSharedFolderOrSubFolder(folderId: string, share: ProjectShare): Promise<FolderWithPath> {
        if (!share.items || !share.items.length) {
            throw createAppError("Retrieving shared folder is currently only supported when share items are explicitly specified");
        }

        const sharedFolderRef = share.items.find(f => f._id === folderId);
        if (sharedFolderRef) {
            // The folder is directly share, return it and treat it like a root
            const folder = await getProjectFolderById(this.db, share.projectId, folderId);
            return {
                ...folder,
                path: [
                    {
                        _id: folder._id,
                        name: folder.name
                    }
                ]
            };
        }

        // folder is not directly shared, check if it's a subfolder of any shared folder
        const folder = await getProjectFolderWithPath(this.db, share.projectId, folderId);
        const rootIndex = folder.path.findIndex(parent => share.items!.some(shared => shared._id === parent._id));
        if (rootIndex === -1) {
            // The folder is not shared
            console.warn(`Attempt to access non-shared folder ${folderId} from project share ${share._id}`);
            throw createNotFoundError('folder');
        }

        // folder is a subfolder of a shared folder
        // trim the path to exclude ancestors of the directly shared folder
        // to avoid exposing information about unshared folders
        // path is sorted from root to leaf
        folder.path.splice(0, rootIndex);
        return folder;
    }
}

export type ISharedProjectsService = PublicProjectService;


class GetProjectShareAllDownloadFilesRetriever {
    private readonly files: DownloadTransferFileResult[] = [];
    private readonly taskQueue: ConcurrentTaskQueue;
    private readonly tracker: TaskTracker;
    private readonly errors: { path: string, error: string }[] = []

    constructor(private share: ProjectShare, private db: Database, private storageHandlers: IStorageHandlerProvider) {
        this.tracker = new TaskTracker(console);
        this.taskQueue = new ConcurrentTaskQueue(10, error => console.error(`Error in task queue`, error));
        
    }

    async run(): Promise<{ files: DownloadTransferFileResult[], errors?: { path: string, error: string }[] }> {
        if (!this.share.items || !this.share.items.length) {
             // TODO: support for "share.allItems"
             throw createAppError("Downloading all project items is currently not supported");
        }

        const path = "";

        const mediaIds = this.share.items.filter(i => i.type === 'media').map(i => i._id);
        const folderIds = this.share.items.filter(i => i.type === 'folder').map(i => i._id);
        const [folders, media] = await Promise.all([
            getMultipleProjectFoldersByIds(this.db, this.share.projectId, folderIds),
            getMultipleMediaByIds(this.db, this.share.projectId, mediaIds)
        ]);

        // the tracker helps know when we have finishing queing all tasks
        for (const folder of folders) {
            this.tracker.startTask();
            this.taskQueue.addTask(async () => {
                await this.processDownloadFilesForFolder(path, folder);
                this.tracker.completeTask();
            });
        }

        this.tracker.startTask();
        this.taskQueue.addTask(async () => {
            await this.processDownloadFilesForMedia(path, media);
            this.tracker.completeTask();
        });

        // here we signal that we have finished queing all tasks
        this.tracker.signalNoMoreTasks();
        await this.tracker.waitForTasksToComplete();
        // TODO: taskQueue.signalNoMoreTasks() seems to have a bug
        // this.taskQueue.signalNoMoreTasks();
        // await this.taskQueue.waitForAllTasksToComplete();

        const result = this.errors.length ?
            { files: this.files, errors: this.errors } :
            { files: this.files };
        
        return result;
    }

    async processDownloadFilesForMedia(path: string, media: Media[]) {
        try {
            const fileIds = media.map(m => m.versions.find(v => v._id === m.preferredVersionId)!.fileId);
            const downloadableFiles = await getDownloadableFiles(fileIds, this.db, this.storageHandlers);

            // rename each file based on the media and file
            for (const file of downloadableFiles) {
                const mediaOfFile = media.find(m => m.versions.find(v => v._id == m.preferredVersionId)!.fileId === file._id);
                if (!mediaOfFile) {
                    throw createInvalidAppStateError(`Expected to find media backed by file ${file._id} but was not found.`);
                }

                // we send back flat files and use the path names to reconstruct the folder hierarchy
                file.name = path ? `${path}/${mediaOfFile.name}` : mediaOfFile.name;
                this.files.push(file);
            }
        } catch (e: any) {
            this.errors.push({
                path: path,
                error: e.message
            });
        }
    }

    async processDownloadFilesForFolder(path: string, folder: Folder) {
        try {
            const [subFolders, media] =  await Promise.all([
                getFoldersByParent(this.db, this.share.projectId, folder._id),
                getProjectMediaByFolder(this.db, this.share.projectId, folder._id)
            ]);

            const newPath = path ? `${path}/${folder.name}` : folder.name;

            for (const subfolder of subFolders) {
                this.tracker.startTask();
                this.taskQueue.addTask(async () => {
                    await this.processDownloadFilesForFolder(newPath, subfolder);
                    this.tracker.completeTask();
                });
            }

            this.tracker.startTask();
            this.taskQueue.addTask(async () => {
                await this.processDownloadFilesForMedia(newPath, media);
                this.tracker.completeTask();
            });
        } catch (e: any) {
            this.errors.push({
                path: `${path}/${folder.name}`,
                error: e.message
            });
        }
    }
}