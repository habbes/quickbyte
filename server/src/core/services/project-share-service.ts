import { Database, DbProjectShare, getSafeProjectShare } from "../db.js";
import { createPersistedModel, ProjectShareInviteCode } from "../models.js";
import {
    AuthContext,
    CreateProjectShareArgs,
    DeleteProjectShareArgs,
    ProjectShare,
    ProjectShareTarget,
    UpdateProjectShareArgs,
    WithCreator,
    GetProjectShareLinkItemsArgs,
    GetProjectShareLinkItemsResult,
ProjectShareLinkItemsRequirePasswordResult
} from "@quickbyte/common";
import { EventDispatcher } from "./event-bus/index.js";
import { ensureSingle, ensureSingleOrEmpty, generateId, hashPassword, verifyPassword, wrapError } from "../utils.js";
import { createAuthError, createInvalidAppStateError, createNotFoundError, createResourceNotFoundError, createValidationError } from "../error.js";
import { Filter } from "mongodb";

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
            // valid. This allows us toggle whether a link is public or not
            // without having to regenerate or remove the code.
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
                password: args.password ? await hashPassword(args.password) : undefined,
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

            if (sharedWith.length) {
                this.config.events.send({
                    type: 'projectShareInvite',
                    data: {
                        projectId: share.projectId,
                        projectShareId: share._id,
                        recipients: sharedWith.filter(s => s.type === 'invite').map(s => {
                            if (s.type !== 'invite') {
                                // This should not occur due to the filter we performed
                                // But the compiler doesn't know that. This if statement
                                // is just here to appease the compiler. We could also have used @ts-ignore. But I like to avoid that.
                                throw createInvalidAppStateError(`Expected shared target with type invite but found type '${s.type}'`);
                            }

                            return ({ email: s.email })
                        })
                    }
                });
            }

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

            if ('name' in args) {
                update.name = args.name;
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

            if ('hasPassword' in args && !args.hasPassword) {
                update.hasPassword = false;
            }
            else if ('hasPassword' in args && args.hasPassword && args.password) {
                update.hasPassword = args.hasPassword;
                update.password = await hashPassword(args.password);

            }

            const sharedWith: ProjectShareInviteCode[] = [];
            // if recipients in args, add new recipients and send them emails
            if (args.recipients && args.recipients.length) {
                for (const recipient of args.recipients) {
                    sharedWith.push({
                        code: generateId(),
                        email: recipient.email,
                        type: 'invite'
                    });
                }
            }

            const result = await this.db.projectShares().findOneAndUpdate({
                projectId: args.projectId,
                _id: args.shareId
            }, {
                $set: update,
                $addToSet: { sharedWith: { $each: sharedWith } }
            }, {
                returnDocument: 'after',
                projection: { password: 0 }
            });

            if (!result.value) {
                throw createNotFoundError("project link");
            }

            if (sharedWith.length) {
                this.config.events.send({
                    type: 'projectShareInvite',
                    data: {
                        projectId: result.value.projectId,
                        projectShareId: result.value._id,
                        recipients: sharedWith.map(s => ({ email: s.email }))
                    }
                });
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

export async function findProjectShares(db: Database, projectId: string, filter: Filter<DbProjectShare>): Promise<WithCreator<ProjectShare>[]> {
    const shares = await db.projectShares().aggregate<WithCreator<ProjectShare>>([
        {
            $match: {
                projectId,
                ...filter
            }
        },
        {
            $project: {
                password: 0
            }
        },
        {
            $lookup: {
                from: db.users().collectionName,
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
}


export function getProjectShareByCode(
    db: Database,
    args: GetProjectShareLinkItemsArgs
): Promise<ProjectShareLinkItemsRequirePasswordResult|WithCreator<ProjectShare> & { sharedEmail?: string }> {
    return wrapError(async () => {
        const result = await db.projectShares().aggregate<WithCreator<DbProjectShare>>([
            {
                $match: {
                    _id: args.shareId,
                    'sharedWith.code': args.code,
                    enabled: true,
                    $or: [
                        { expiresAt: null },
                        {
                            expiresAt: { $gt: new Date() } 
                        }
                    ]
                }
            },
            {
                $limit: 1
            },
            {
                $lookup: {
                    from: db.users().collectionName,
                    foreignField: '_id',
                    localField: '_createdBy._id',
                    as: 'creator',
                    pipeline: [
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
                $unwind: '$creator'
            }
        ]).toArray();
        const share = ensureSingleOrEmpty(result);
        if (!share) {
            throw createResourceNotFoundError("The link is invalid or has been disabled.");
        }

        // if code is public, make sure the public link is enabled
        const sharedWith = share.sharedWith.find(s => s.code === args.code);
        if (sharedWith && sharedWith.type === 'public' && !share.public) {
            throw createResourceNotFoundError("This link is invalid or has been disabled.");
        }

        if (share.hasPassword && !args.password) {
            return {
                passwordRequired: true
            }
        }

        if (share.hasPassword && share.password && args.password) {
            const passwordCorrect = await verifyPassword(args.password, share.password);
            if (!passwordCorrect) {
                throw createAuthError("The password is incorrect.");
            }
        }

        const safeShare: WithCreator<ProjectShare> & { sharedEmail?: string } = getSafeProjectShare(share);
        const sharedCode = safeShare.sharedWith.find(s => s.code === args.code);
        if (sharedCode && sharedCode.type === 'invite') {
            safeShare.sharedEmail = sharedCode.email
        }

        return safeShare;
    });
}