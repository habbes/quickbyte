import { Database } from "../db.js";
import { AuthContext, CreateFolderArgs, CreateFolderTreeArgs, Folder } from "@quickbyte/common";
import { createAppError, createResourceNotFoundError, rethrowIfAppError } from "../error.js";
import { createPersistedModel } from "../models.js";
import { Filter } from "mongodb";


export class FolderService {
    constructor(private db: Database, private authContext: AuthContext) {
    }

    async createFolder(args: CreateFolderArgs): Promise<Folder> {
        try {
            const folder: Folder = {
                ...createPersistedModel(this.authContext.user._id),
                name: args.name,
                projectId: args.projectId
            };

            if (args.parentId) {
                const parentFolder = await this.db.folders().findOne({ _id: args.parentId, projectId: args.projectId });
                if (!parentFolder) {
                    throw createResourceNotFoundError("The specified parent folder was not found.");
                }

                folder.parentId = parentFolder._id;
            }

            // If a folder by this name exists at the same path (with the same parent),
            // then return the existing folder instead of creating a new one with a duplicate name
            // or throwing an error

            const folderQuery: Filter<Folder> = {
                name: args.name,
                projectId: args.projectId
            };

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
                returnDocument: 'after'
            });

            if (!result.value) {
                throw createAppError(`Failed to update folder ${args.name}`, 'dbError');
            }

            return result.value;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async createFolderTree(args: CreateFolderTreeArgs) {
        try {
            const paths = args.paths;
            // group paths into a tree
            const folderNodes = pathsToTree(paths);

            
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

type FolderNode = {
    name: string;
    path: string;
    children: FolderNode[]
}

function pathsToTree(paths: string[]) {
    const visitedNodes = new Map<string, FolderNode>();
    for (let path of paths) {
        buildPathBranch(path, visitedNodes);
    }

    return visitedNodes;
}

function buildPathBranch(path: string, visitedNodes: Map<string, FolderNode>, parent?: FolderNode) {
    const [name, children] = path.split('/', 2);

    const nodePath = parent ? `${parent.path}/${name}` : name;
    
    let node = visitedNodes.get(nodePath);
    if (!node) {
        node = {
            name,
            path: nodePath,
            children: []
        };
        visitedNodes.set(node.path, node);
    
        if (parent) {
            parent.children.push(node);
        }
    }

    if (!children) {
        return;
    }

    buildPathBranch(children, visitedNodes, parent);
}

export type IFolderService = FolderService;
