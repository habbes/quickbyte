import { Database, DbProjectShare, getSafeProjectShare } from "../db.js";
import { createPersistedModel } from "../models.js";
import {
    AuthContext,
    CreateProjectShareArgs,
    DeleteProjectShareArgs,
    ProjectShare,
    ProjectShareTarget,
    UpdateProjectShareArgs,
    WithCreator
} from "@quickbyte/common";
import { EventDispatcher } from "./event-bus/index.js";
import { generateId, wrapError } from "../utils.js";
import { createNotFoundError, createValidationError } from "../error.js";

export interface ProjectShareServiceConfig {
    events: EventDispatcher
}

export class ProjectShareService {
    
    constructor(private db: Database, private authContext: AuthContext, private config: ProjectShareServiceConfig) {
    }

    createProjectShare(args: CreateProjectShareArgs): Promise<ProjectShare> {
        // we expect the caller to check permissions
        return wrapError(async () => {
            // perform extra validation not handled by zod
            if (args.expiresAt && args.expiresAt <= new Date()) {
                throw createValidationError('Invalid expiry date. The expiry date should be a date later than today.');
            }

            if (!args.allItems && (!args.items || !args.items.length)) {
                throw createValidationError('You should select items to share. Or allow sharing all items.');
            }

            if (args.allItems && args.items) {
                throw createValidationError('Either allItems or items list should be set, but not both.');
            }

            if (!args.public && !(args.recipients && args.recipients.length))
            {
                throw createValidationError('The ')
            }

            const sharedWith: ProjectShareTarget[] = [];

            // we always generate a public link code even when
            // the share is not made "public".
            // When share.public is false, this code will not be considered
            // valid.
            sharedWith.push({
                type: 'public',
                code: generateId()
            });

            for (let recipient of args.recipients) {
                sharedWith.push({
                    type: 'invite',
                    code: generateId(),
                    email: recipient.email
                });
            }

            const share: DbProjectShare = {
                ...createPersistedModel(this.authContext.user._id),
                name: args.name,
                projectId: args.projectId,
                hasPassword: args.password ? true : false,
                password: args.password,
                allItems: args.allItems,
                items: args.items,
                enabled: true,
                public: args.public,
                sharedWith,
                allowDownload: args.allowDownload,
                allowComments: args.allowComments,
                showAllVersions: args.showAllVersions,
                expiresAt: args.expiresAt
            };

            await this.db.projectShares().insertOne(share);

            this.config.events.send({
                type: 'projectShareCreated',
                data: {
                    projectId: share.projectId,
                    projectShareId: share._id
                }
            });

            return getSafeProjectShare(share);
        });
    }

    listByProject(projectId: string): Promise<WithCreator<ProjectShare>[]> {
        return wrapError(async () => {
            const shares = await this.db.projectShares().aggregate<WithCreator<ProjectShare>>([
                {
                    $match: {
                        projectId
                    }
                },
                {
                    $project: {
                        password: 0
                    }
                },
                {
                    $lookup: {
                        from: this.db.users().collectionName,
                        foreignField: '_id',
                        localField: '_createdBy._id',
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    name: 1
                                }
                            }
                        ],
                        as: 'creator'
                    }
                }, {
                    $unwind: '$creator'
                }
            ]).toArray();

            return shares;
        });
    }

    updateProjectShare(args: UpdateProjectShareArgs): Promise<ProjectShare> {
        return wrapError(async () => {
            if (args.expiresAt && args.expiresAt <= new Date()) {
                throw createValidationError('Invalid expiry date. The expiry date should be a date later than today.');
            }

            const update: Partial<DbProjectShare> = {
                _updatedAt: new Date(),
                _updatedBy: { _id: this.authContext.user._id, type: 'user' }
            };
    
            if (args.expiresAt) {
                update.expiresAt = args.expiresAt
            }

            if ('enabled' in args) {
                update.enabled = args.enabled;
            }

            if ('password' in args) {
                update.password = args.password;
            }

            if ('public' in args) {
                update.public = args.public;
            }

            if ('allowDownload' in args) {
                update.allowDownload = args.allowDownload;
            }

            if ('allowComments' in args) {
                update.allowComments = args.allowComments;
            }

            if ('showAllVersions' in args) {
                update.showAllVersions = args.showAllVersions;
            }

            if ('password' in args && args.password) {
                update.hasPassword = true;
                // TODO: hashPassword
                update.password = args.password;
            }

            // if recipients in args, add new recipients and send them emails

            const result = await this.db.projectShares().findOneAndUpdate({
                projectId: args.projectId,
                _id: args.shareId
            }, {
                $set: update
            }, {
                returnDocument: 'after',
                projection: { password: 0 }
            });

            if (!result.value) {
                throw createNotFoundError("project link");
            }

            return result.value;
        });
    }

    deleteProjectShare(args: DeleteProjectShareArgs): Promise<void> {
        return wrapError(async () => {
            const result = await this.db.projectShares().findOneAndDelete({
                projectId: args.projectId,
                _id: args.shareId
            });

            if (!result.value) {
                throw createNotFoundError('project link');
            }
        });
    }
}

export type IProjectShareService = ProjectShareService;
