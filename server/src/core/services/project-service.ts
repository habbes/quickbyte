import { Db, Collection } from "mongodb";
import { AuthContext, Comment, Media, Project, RoleType, createPersistedModel } from "../models.js";
import { rethrowIfAppError, createAppError, createSubscriptionRequiredError, createResourceNotFoundError } from "../error.js";
import { CreateProjectMediaUploadArgs, CreateTransferResult, ITransactionService, ITransferService } from "./index.js";
import { IInviteService } from "./invite-service.js";
import { IMediaService, MediaService, MediaWithFile } from "./media-service.js";
import { CreateMediaCommentArgs } from "./comment-service.js";
import { IAccessHandler } from "./access-handler.js";

const COLLECTION = 'projects';

export interface ProjectServiceConfig {
    transactions: ITransactionService;
    transfers: ITransferService;
    media: IMediaService;
    invites: IInviteService;
    access: IAccessHandler;
}

export class ProjectService {
    private collection: Collection<Project>;

    constructor(private db: Db, private authContext: AuthContext, private config: ProjectServiceConfig ) {
        this.collection = db.collection(COLLECTION);
    }

    async createProject(args: CreateProjectArgs): Promise<Project> {
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

            return project;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e); 
        }
    }

    async getById(id: string): Promise<Project> {
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

    async getByAccount(accountId: string): Promise<Project[]> {
        try {
            const projects = await this.collection.find({ accountId }).toArray();
            return projects;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async updateProject(id: string, args: UpdateProjectArgs) {
        try {
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
            const project = await this.getById(id);
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
            await this.getById(id);
            const media = await this.config.media.getProjectMedia(id);
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getMediumById(projectId: string, id: string): Promise<MediaWithFile> {
        try {
            const media = await this.config.media.getMediaById(projectId, id);
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async createMediaComment(projectId: string, mediaId: string, args: CreateMediaCommentArgs): Promise<Comment> {
        return this.config.media.createMediaComment(projectId, mediaId, args);
    }

    async inviteUsers(id: string, args: InviteUserArgs) {
        try {
            const project = await this.getById(id);
            
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

            await Promise.all(invites);

        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type IProjectService = Pick<ProjectService, 'createProject'|'getByAccount'|'getById'|'updateProject'|'uploadMedia'|'getMedia'|'getMediumById'|'inviteUsers'|'createMediaComment'>;

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