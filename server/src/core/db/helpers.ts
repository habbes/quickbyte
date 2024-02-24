import { createAppError, createInvalidAppStateError, createNotFoundError, createResourceNotFoundError, rethrowIfAppError } from "../error.js";
import { Database } from "./db.js";
import { Project, ProjectMember } from "@quickbyte/common";

export async function getProjectMembersById(db: Database, projectId: string): Promise<ProjectMember[]> {
    try {
        const project = await db.projects().findOne({ _id: projectId });
        if (!project) {
            throw createNotFoundError('project');
        }

        const members = await getProjectMembers(db, project);
        return members;
    } catch (e: any) {
        rethrowIfAppError(e);
        throw createAppError(e);
    }
}
export async function getProjectMembers(db: Database, project: Project): Promise<ProjectMember[]> {
    try {
        const id = project._id;
        const ownerTask = db.users().findOne({ _id: project._createdBy._id });
        const otherUsersTask = db.projects().aggregate<ProjectMember>([
            {
                $match: {
                    _id: id
                }
            },
            {
                $lookup: {
                    from: db.roles().collectionName,
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
                                from: db.users().collectionName,
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
