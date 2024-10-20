import { createFilterForDeleteableResource, Database, deleteNowBy } from "../db.js";
import { AuthContext, CreateFolderArgs, CreateFolderTreeArgs, Folder, FolderPathEntry, FolderWithPath, UpdateFolderArgs, MoveFoldersToFolderArgs, SearchProjectFolderArgs, escapeRegExp, DeletionCountResult } from "@quickbyte/common";
import { createAppError, createInvalidAppStateError, createNotFoundError, createResourceConflictError, createResourceNotFoundError, isMongoDuplicateKeyError, rethrowIfAppError } from "../error.js";
import { createPersistedModel } from "../models.js";
import { Filter } from "mongodb";
import { wrapError } from "../utils.js";


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
        return getProjectFolderById(this.db, projectId, id);
    }

    async getProjectFolderWithPath(projectId: string, folderId: string): Promise<FolderWithPath> {
        return getProjectFolderWithPath(this.db, projectId, folderId);
    }

    getFoldersByParent(projectId: string, parentId?: string): Promise<Folder[]> {
        return getFoldersByParent(this.db, projectId, parentId);
    }

    async updateFolder(args: UpdateFolderArgs): Promise<Folder> {
        try {

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
            });

            if (!result.value) {
                throw createAppError(`Could not update folder '${args.id}': ${result.lastErrorObject}`, 'dbError');
            }

            return result.value;
        }
        catch (e: any) {
            if (isMongoDuplicateKeyError(e)) {
                throw createResourceConflictError("A folder with the specified name already exists in this path.");
            }
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async moveFolders(args: MoveFoldersToFolderArgs): Promise<Folder[]> {
        const session = this.db.startSession();
        try {
            session.startTransaction();
            let folderIds = args.folderIds;
            // ensure target folder exists if provided
            // if target folder is null, then move to project root
            let targetFolder: Folder|null = null;
            if (args.targetFolderId) {
                targetFolder = await this.db.folders().findOne(
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

                // we don't want to make a folder its own parent
                folderIds = folderIds.filter(id => id !== args.targetFolderId);
            }

            const result = await this.db.folders().updateMany(
                createFilterForDeleteableResource({
                    _id: { $in: folderIds },
                    projectId: args.projectId
                }), {
                    $set: {
                        parentId: targetFolder ? targetFolder._id : null,
                        _updatedAt: new Date(),
                        _updatedBy: { type: 'user', _id: this.authContext.user._id }
                    }
                }, {
                    session
                }
            );

            const updatedFolders = await this.db.folders().find(
                createFilterForDeleteableResource({
                    _id: { $in: folderIds },
                    projectId: args.projectId
                }), {
                    session
                }
            ).toArray();

            await session.commitTransaction();
            return updatedFolders;
        } catch (e: any) {
            await session.abortTransaction();
            rethrowIfAppError(e);
            throw createAppError(e);
        } finally {
            await session.endSession();
        }
    }

    async searchProjectFolders(args: SearchProjectFolderArgs): Promise<FolderWithPath[]> {
        try {
            const rawFolders = await this.db.folders().aggregate<Folder & { rawPath: Folder[] }>([
                {
                    $match: createFilterForDeleteableResource({
                        projectId: args.projectId,
                        // TODO: full regex search may not be efficient
                        // consider restricting to a case-sensitive prefix scan
                        // $text operator with appropriate indexes
                        // or full-text-search?
                        name: { $regex: escapeRegExp(args.searchTerm), $options: "i" }
                    })
                },
                {
                    $graphLookup: {
                        from: this.db.folders().collectionName,
                        startWith: "$parentId",
                        connectFromField: "parentId",
                        connectToField: "_id",
                        as: "rawPath"
                    }
                }
            ]).toArray();

            const normalizedFolders = rawFolders.map(f => normalizeFolderWithPath(f));

            return normalizedFolders;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async deleteFolders(projectId: string, folderIds: string[]): Promise<DeletionCountResult> {
        try {
            const result = await this.db.folders().updateMany(
                createFilterForDeleteableResource({
                    projectId,
                    _id: { $in: folderIds }
                }),
                {
                    $set: deleteNowBy(this.authContext.user._id)
                }
            );

            return {
                deletedCount: result.modifiedCount
            };
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

export async function getProjectFolderById(db: Database, projectId: string, folderId: string) {
    const folder = await db.folders().findOne(createFilterForDeleteableResource({ projectId: projectId, _id: folderId }));
    if (!folder) {
        throw createNotFoundError('folder');
    }

    return folder;
}

export async function getProjectFolderWithPath(db: Database, projectId: string, folderId: string) {
    try {
        const result = await db.folders().aggregate<Folder & { rawPath: Folder[] }>([
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
                    from: db.folders().collectionName,
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
        const normalizedFolder = normalizeFolderWithPath(folder);
        return normalizedFolder;
    } catch (e: any) {
        rethrowIfAppError(e);
        throw createAppError(e);
    }
}

export function getFoldersByParent(db: Database, projectId: string, parentId?: string): Promise<Folder[]> {
    return wrapError(async () => {
        const query: Filter<Folder> = createFilterForDeleteableResource({
            projectId
        });

        if (parentId) {
            query.parentId = parentId;
        } else {
            query.$or = [{ parentId: { $exists: false } }, { parentId: null }];
        }

        const result = await db.folders().find(query).toArray();
        return result;
    });
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

/**
 * Returns the folder with the path sorted from root to leaf, where the leaf
 * refers to the target folder
 * @param folder 
 */
function normalizeFolderWithPath(folder: Folder & { rawPath: Folder[] }): FolderWithPath {
    // the results returned from $graphLookup are not
    // guaranteed to be ordered. So let's manually
    // sort the paths from root to lead
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
    
    // @ts-ignore
    delete normalizedFolder.rawPath;

    return normalizedFolder;
}

export function getMultipleProjectFoldersByIds(db: Database, projectId: string, ids: string[]): Promise<Folder[]> {
    return wrapError(async () => {
        const folders = await db.folders().find(
            createFilterForDeleteableResource({
                projectId: projectId,
                _id: { $in: ids }
            })
        ).toArray();

        return folders;
    });
}

export type IFolderService = FolderService;
