import { createFilterForDeleteableResource, Database } from "../db.js";
import { AuthContext, CreateFolderArgs, CreateFolderTreeArgs, Folder, FolderPathEntry, FolderWithPath, UpdateFolderArgs, MoveFolderToFolderArgs } from "@quickbyte/common";
import { createAppError, createInvalidAppStateError, createNotFoundError, createResourceConflictError, createResourceNotFoundError, rethrowIfAppError } from "../error.js";
import { createPersistedModel } from "../models.js";
import { Filter } from "mongodb";


export class FolderService {
    constructor(private db: Database, private authContext: AuthContext) {
    }

    async createFolder(args: CreateFolderArgs): Promise<Folder> {
        const session = this.db.startSession();
        try {
            session.startTransaction();
            const folder: Folder = {
                ...createPersistedModel(this.authContext.user._id),
                name: args.name,
                projectId: args.projectId
            };

            // Performing manual validation here because this method can be called by
            // other internal methods and I want to make sure we don't accidentally
            // store an empty folder name in the DB. Since this should not happen
            // from internal code, I'm throwing an invalidate state
            // instead of normal validation error
            const validationResult = CreateFolderArgs.safeParse(args);
            if (!validationResult.success) {
                throw createInvalidAppStateError(`Invalid folder args passed by internal method: ${validationResult.error.message}`);
            }

            if (args.parentId) {
                // checking for the parent, then creating the child in two separate calls is
                // suscetible to race conditions that can cause the child folder to be created
                // in an orpharned state. We should consider using a transaction here.
                const parentFolder = await this.db.folders().findOne(
                    createFilterForDeleteableResource({ _id: args.parentId, projectId: args.projectId }),
                    {
                        session
                    }
                );
                if (!parentFolder) {
                    throw createResourceNotFoundError("The specified parent folder was not found.");
                }

                folder.parentId = parentFolder._id;
            }

            // If a folder by this name exists at the same path (with the same parent),
            // then return the existing folder instead of creating a new one with a duplicate name
            // or throwing an error

            const folderQuery: Filter<Folder> = createFilterForDeleteableResource({
                name: args.name,
                projectId: args.projectId
            });

            if (args.parentId) {
                folderQuery.parentId = args.parentId;
            }

            const result = await this.db.folders().findOneAndUpdate(folderQuery, {
                $set: {
                    _updatedBy: folder._updatedBy,
                    _updatedAt: folder._updatedAt
                },
                $setOnInsert: {
                    _id: folder._id,
                    name: folder.name,
                    projectId: folder.projectId,
                    parentId: folder.parentId,
                    _createdAt: folder._createdAt,
                    _createdBy: folder._createdBy
                }
            }, {
                upsert: true,
                returnDocument: 'after',
                session
            });

            if (!result.value) {
                throw createAppError(`Failed to update folder ${args.name}`, 'dbError');
            }

            await session.commitTransaction();

            return result.value;
        } catch (e: any) {
            await session.abortTransaction();
            rethrowIfAppError(e);
            throw createAppError(e);
        }
        finally {
            await session.endSession();
        }
    }

    async createFolderTree(args: CreateFolderTreeArgs): Promise<Map<string, Folder>> {
        try {
            const paths = args.paths;
            // group paths into a tree
            const folderTree = pathsToTree(paths);

            // we'll create parent trees before their children
            // to ensure there are no orphan folders in case something
            // goes wrong. Then we'll map each created folder to its
            // path in the following map

            const folderMap = new Map<string, Folder>();
            if (!folderTree.length) {
                return folderMap;
            }
            await this.createFolderNodes(args, folderTree, folderMap);

            return folderMap;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getProjectFolderById(projectId: string, id: string): Promise<Folder> {
        try {
            const folder = await this.db.folders().findOne(createFilterForDeleteableResource({ projectId: projectId, _id: id }));
            if (!folder) {
                throw createNotFoundError('folder');
            }

            return folder;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getProjectFolderWithPath(projectId: string, folderId: string): Promise<FolderWithPath> {
        try {
            const result = await this.db.folders().aggregate<Folder & { rawPath: Folder[] }>([
                {
                    $match: createFilterForDeleteableResource<Folder>({
                        projectId: projectId,
                        _id: folderId
                    })
                },
                // return list of ancestor folders
                // ordering is not guaranteed
                // see: https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/
                {
                    $graphLookup: {
                        from: this.db.folders().collectionName,
                        startWith: "$parentId",
                        connectFromField: "parentId",
                        connectToField: "_id",
                        as: "rawPath"
                    }
                },
            ]).toArray();

            if (!result.length) {
                throw createNotFoundError("folder");
            }

            const folder = result[0];

            // the results returned from $graphLookup are not
            // guaranteed to be order. So let's manually
            // sort the paths from leaf to root
            const path: FolderPathEntry[] = [];

            let current: Folder|undefined = folder;
            while (current) {
                path.push({ _id: current._id, name: current.name });
                // since we expect the path to have a small number of entries,
                // a linear search is probably better than creating a hashmap for folders
                current = current.parentId ? folder.rawPath.find(p => p._id === current!.parentId) : undefined;
            }

            path.reverse();

            const normalizedFolder = {
                ...folder,
                path
            };

            return normalizedFolder;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getFoldersByParent(projectId: string, parentId?: string): Promise<Folder[]> {
        try {
            const query: Filter<Folder> = createFilterForDeleteableResource({
                projectId
            });

            if (parentId) {
                query.parentId = parentId;
            } else {
                query.$or = [{ parentId: { $exists: false } }, { parentId: null }];
            }

            const result = await this.db.folders().find(query).toArray();
            return result;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async updateFolder(args: UpdateFolderArgs): Promise<Folder> {
        const session = this.db.startSession();
        try {
            session.startTransaction();
            const original = await this.db.folders().findOne(
                createFilterForDeleteableResource({
                _id: args.id,
                projectId: args.projectId,
                }),
                {
                    session
                }
            );

            if (!original) {
                throw createNotFoundError("folder");
            }
            
            // we have to check for conflicts manually since we have not set up
            // a unique index for that
            const duplicate = await this.db.folders().findOne(
                createFilterForDeleteableResource({
                    projectId: args.projectId,
                    name: args.name,
                    parentId: original.parentId
                }),
                {
                    session
                }
            );

            if (duplicate) {
                throw createResourceConflictError("A folder with the specified name already exists in this path.");
            }

            const result = await this.db.folders().findOneAndUpdate(createFilterForDeleteableResource({
                _id: args.id,
                projectId: args.projectId,
            }), {
                $set: {
                    name: args.name,
                    _updatedAt: new Date(),
                    _updatedBy: { type: 'user', _id: this.authContext.user._id }
                }
            }, {
                returnDocument: 'after',
                session
            });

            if (!result.value) {
                throw createAppError(`Could not update folder '${args.id}': ${result.lastErrorObject}`, 'dbError');
            }

            await session.commitTransaction();

            return result.value;
        }
        catch (e: any) {
            await session.abortTransaction();
            rethrowIfAppError(e);
            throw createAppError(e);
        }
        finally {
            await session.endSession();
        }
    }

    async moveFolder(args: MoveFolderToFolderArgs): Promise<Folder> {
        const session = this.db.startSession();
        try {
            session.startTransaction();
            // ensure target folder exists
            const targetFolder = await this.db.folders().findOne(
                createFilterForDeleteableResource({
                    _id: args.targetFolderId,
                    projectId: args.projectId,
                }), {
                    session
                }
            );
            
            if (!targetFolder) {
                throw createResourceNotFoundError("The specified target folder does not exist.");
            }

            const result = await this.db.folders().findOneAndUpdate(
                createFilterForDeleteableResource({
                    _id: args.folderId,
                    projectId: args.projectId
                }), {
                    $set: {
                        parentId: args.targetFolderId,
                        _updatedAt: new Date(),
                        _updatedBy: { type: 'user', _id: this.authContext.user._id }
                    }
                }, {
                    session,
                    returnDocument: 'after'
                }
            );

            if (!result.value) {
                throw createResourceNotFoundError("The specified folder does not exist.");
            }

            await session.commitTransaction();
            return result.value;
        } catch (e: any) {
            await session.abortTransaction();
            rethrowIfAppError(e);
            throw createAppError(e);
        } finally {
            await session.endSession();
        }
    }

    async deleteFolder(projectId: string, folderId: string): Promise<void> {
        try {
            // permissions should be checked by the called (project-service)
            const result = await this.db.folders().findOneAndUpdate(
                createFilterForDeleteableResource({
                    projectId,
                    _id: folderId
                }),
                {
                    $set: {
                        deleteAt: new Date(),
                        deleted: true,
                        deletedBy: { type: 'user', _id: this.authContext.user._id }
                    }
                }
            );

            if (!result.value) {
                throw createResourceNotFoundError("folder");
            }
            // TODO: trigger job to mark all children with parentDeleted: true
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private async createFolderNodes(args: CreateFolderTreeArgs, folderTree: FolderNode[], resultMap: Map<string, Folder>): Promise<void> {
        try {
            const topLevelFolderTasks = folderTree.map(async (folderNode) => {
                const folderArgs: CreateFolderArgs = {
                    name: folderNode.name,
                    projectId: args.projectId
                };
                const parent = resultMap.get(folderNode.parentPath);
                // Since we persists parents before children,
                // we're guaranteed that only top-level folders
                // don't have parents in the map
                if (parent) {
                    folderArgs.parentId = parent._id;
                }

                const folder = await this.createFolder(folderArgs);

                resultMap.set(folderNode.path, folder);
            });

            // TODO awaiting tasks one level at a time,
            // use a task queue with a configuarable max concurrency size
            await Promise.all(topLevelFolderTasks);
            for (let parentNode of folderTree) {
                await this.createFolderNodes(args, parentNode.children, resultMap);
            }
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

type FolderNode = {
    name: string;
    path: string;
    parentPath: string;
    children: FolderNode[]
}

function pathsToTree(paths: string[]) {
    const visitedNodes = new Map<string, FolderNode>();
    const root: FolderNode = {
        path: "",
        parentPath: "",
        children: [],
        name: ""
    };

    for (let path of paths) {
        buildPathBranch(path, visitedNodes, root);
    }

    return root.children;
}

function buildPathBranch(path: string, visitedNodes: Map<string, FolderNode>, parent: FolderNode) {
    const sepIndex = path.indexOf('/');
    const name = sepIndex === -1 ? path : path.substring(0, sepIndex);
    const remainingPath = sepIndex === -1 ? undefined : path.substring(sepIndex + 1);

    const nodePath = parent.path ? `${parent.path}/${name}` : name;
    
    let node = visitedNodes.get(nodePath);
    if (!node) {
        node = {
            name,
            path: nodePath,
            parentPath: parent.path,
            children: []
        };
        visitedNodes.set(node.path, node);
    
        if (parent) {
            parent.children.push(node);
        }
    }

    if (!remainingPath) {
        return;
    }

    buildPathBranch(remainingPath, visitedNodes, node);
}

export type IFolderService = FolderService;
