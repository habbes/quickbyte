import { Collection } from "mongodb";
import { AuthContext, Comment, Media, Project, RoleType, WithRole, ProjectMember, createPersistedModel, UpdateMediaArgs } from "../models.js";
import { rethrowIfAppError, createAppError, createSubscriptionRequiredError, createResourceNotFoundError, createInvalidAppStateError } from "../error.js";
import { CreateTransferResult, EmailHandler, ITransactionService, ITransferService, LinkGenerator, createMediaCommentNotificationEmail } from "./index.js";
import { CreateProjectMediaUploadArgs, MediaWithFileAndComments } from '@quickbyte/common';
import { IInviteService } from "./invite-service.js";
import { IMediaService  } from "./media-service.js";
import { CreateMediaCommentArgs } from "./comment-service.js";
import { IAccessHandler } from "./access-handler.js";
import { Database } from "../db.js";

export interface ProjectServiceConfig {
    transactions: ITransactionService;
    transfers: ITransferService;
    media: IMediaService;
    invites: IInviteService;
    access: IAccessHandler;
    links: LinkGenerator,
    email: EmailHandler,
}

export class ProjectService {
    private collection: Collection<Project>;

    constructor(private db: Database, private authContext: AuthContext, private config: ProjectServiceConfig ) {
        this.collection = db.projects();
    }

    async createProject(args: CreateProjectArgs): Promise<WithRole<Project>> {
        try {
            const sub = await this.config.transactions.tryGetActiveSubscription();
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
            const projects = await this.collection.find({ accountId }).toArray();
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
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['admin', 'editor']);
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

    async uploadMedia(id: string, args: CreateProjectMediaUploadArgs): Promise<UploadMediaResult> {
        try {
            const project = await this.getByIdInternal(id);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['admin', 'editor']);
            const transfer = await this.config.transfers.createProjectMediaUpload(project, args);
            const media = await this.config.media.uploadMedia(transfer);

            return {
                media,
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
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner', 'admin', 'editor']);
            const media = await this.config.media.getProjectMedia(id);
            return media;
        } catch (e: any) {
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

    async deleteMedia(projectId: string, mediaId: string): Promise<void> {
        try {
            const project = await this.getByIdInternal(projectId);
            await this.config.access.requireRoleOrOwner(this.authContext.user._id, 'project', project, ['owner','admin', 'editor']);

            await this.config.media.deleteMedia(projectId, mediaId);
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async createMediaComment(projectId: string, mediaId: string, args: CreateMediaCommentArgs): Promise<Comment> {
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
                        url: this.config.links.getMediaCommentUrl(projectId, mediaId, comment._id)
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
            
            const members = await this.getMembersInternal(project);

            return members;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private async getByIdInternal(id: string): Promise<Project> {
        try {
            const project = await this.collection.findOne({ _id: id });
            if (!project) {
                throw createResourceNotFoundError();
            }

            return project;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

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

export type IProjectService = Pick<ProjectService, 'createProject'|'getByAccount'|'getById'|'updateProject'|'uploadMedia'|'getMedia'|'getMediumById'|'inviteUsers'|'createMediaComment'|'getMembers'|'updateMedia'|'deleteMedia'>;

export interface CreateProjectArgs {
    name: string;
    description: string;
}

export interface UpdateProjectArgs {
    name: string;
}

export interface InviteUserArgs {
    users: { email: string }[];
    message?: string;
    role: RoleType;
}

export interface UploadMediaResult {
    media: Media[],
    transfer: CreateTransferResult
}