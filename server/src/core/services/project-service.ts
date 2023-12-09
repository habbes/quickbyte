import { Db, Collection, UpdateFilter } from "mongodb";
import { AuthContext, Project, createPersistedModel } from "../models.js";
import { rethrowIfAppError, createAppError, createSubscriptionRequiredError, createResourceNotFoundError } from "../error.js";
import { ITransactionService } from "./index.js";
import { IInviteService } from "./invite-service.js";

const COLLECTION = 'projects';

export interface ProjectServiceConfig {
    transactions: ITransactionService;
    invites: IInviteService;
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
                name: args.name
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

    async get(): Promise<Project[]> {
        try {
            const projects = await this.collection.find().toArray();
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

    async inviteUsers(id: string, args: InviteUserArgs) {
        try {
            const project = await this.getById(id);
            
            const invites = args.users.map(user => this.config.invites.createInvite({
                email: user.email,
                resource: {
                    type: 'project',
                    id: project._id,
                    name: project.name
                }
            }));

            await Promise.all(invites);

        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type IProjectService = Pick<ProjectService, 'createProject'|'get'|'getById'|'updateProject'|'inviteUsers'>;

export interface CreateProjectArgs {
    name: string;
}

export interface UpdateProjectArgs {
    name: string;
}

export interface InviteUserArgs {
    users: { email: string }[];
    message?: string;
}