import { Db, Collection, Filter } from "mongodb";
import { UserRole, ResourceType, RoleType, Principal, AuthContext, createPersistedModel } from "../models.js";
import { createAppError, createPermissionError, rethrowIfAppError} from "../error.js";

const COLLECTION = 'roles';

interface OwnedResource {
    _id: string;
    ownerId: string;
}

interface CreatedResource {
    _id: string;
    _createdBy: Principal
}

type AuthorizableResource = OwnedResource | CreatedResource;

export class AuthorizationHandler {
    private collection: Collection<UserRole>;

    constructor(private db: Db) {
        this.collection = db.collection<UserRole>(COLLECTION);
    }

    public async verifyCanListProjectMedia(userId: string, projectId: string): Promise<void> {
        await this.requireUserRole(userId, 'project', projectId, ['reviewer', 'editor', 'admin']);
    }

    public async assignRole(assignedBy: Principal, userId: string, resourceType: ResourceType, resourceId: string, role: RoleType) {
        try {
            
            const existingRole = await this.rolesCollection.findOne({
                userId,
                resourceType,
                resourceId,
            });

            if (existingRole) {
                const update = await this.collection.findOneAndUpdate({ _id: existingRole._id }, {
                    $set: {
                        updatedAt: new Date(),
                        updatedBy: assignedBy,
                        role: role
                    }
                }, {
                    returnDocument: 'after'
                });

                if (!update.value) {
                    throw createAppError(`Failed to update role: '${existingRole._id}': ${update.lastErrorObject}`);
                }

                return update.value;
            } else {
                const newRole: UserRole = {
                    ...createPersistedModel(assignedBy),
                    userId,
                    resourceType,
                    resourceId,
                    role
                };
                
                await this.collection.insertOne(newRole);

                return newRole;
            }
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    public isOwner<T extends AuthorizableResource>(userId: string, resource: T) {
        if ('ownerId' in resource) {
            return resource.ownerId === userId;
        }

        return resource._createdBy._id === userId;
    }

    public async requireRoleOrOwner<T extends AuthorizableResource>(userId: string, resourceType: ResourceType, resource: T, allowedRoles: RoleType[]) {
        if (this.isOwner(userId, resource)) {
            return;
        }

        await this.requireUserRole(userId, resourceType, resource._id, allowedRoles);
    }

    public async requireUserRole(userId: string, resourceType: ResourceType, resourceId: string, allowedRoles: RoleType[]) {
        const role = await this.getUserRole(userId, resourceType, resourceId, allowedRoles);
        if (!role) {
            throw createPermissionError();
        }

        return role;
    }
    
    private async getUserRole(userId: string, resourceType: ResourceType, resourceId: string, allowedRoles?: RoleType[]): Promise<UserRole|null> {
        try {
            const query: Filter<UserRole> = { userId, resourceType, resourceId };
            if (allowedRoles) {
                query.role = { $in: allowedRoles }
            };
    
            const record = await this.collection.findOne({ userId, resourceType, resourceId });
            return record;
        } catch (e: any) {
            throw createAppError(e);
        }
    }
}

export type IAuthorizationHandler = Pick<AuthorizationHandler, 'isOwner'|'requireRoleOrOwner'|'requireUserRole'|'assignRole'>;