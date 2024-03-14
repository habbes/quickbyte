import { Database } from "../db.js";
import { AuthContext, CreateFolderArgs, CreateFolderTreeArgs, Folder } from "@quickbyte/common";
import { createAppError, createResourceNotFoundError, rethrowIfAppError } from "../error.js";
import { createPersistedModel } from "../models.js";


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

            await this.db.folders().insertOne(folder);

            return folder;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async createFolderTree(args: CreateFolderTreeArgs) {
        try {
            const paths = args.paths;
            // group paths into a tree
            type FolderItem = {
                id: string;
                name: string;
                path: string;
                children: FolderItem[];
            };

            const folderTreeMap = new Map();
            
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type IFolderService = FolderService;
