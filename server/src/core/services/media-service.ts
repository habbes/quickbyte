import { Db, Collection } from "mongodb";
import { AuthContext, createPersistedModel, Media, MediaVersion } from "../models.js";
import { rethrowIfAppError, createAppError, createResourceNotFoundError, createInvalidAppStateError } from "../error.js";
import { CreateTransferFileResult, CreateTransferResult, DownloadTransferFileResult, ITransferService } from "./index.js";

const COLLECTION = 'media';

export interface MediaServiceConfig {
    transfers: ITransferService
}

export class MediaService {
    private collection: Collection<Media>;

    constructor(private db: Db, private authContext: AuthContext, private config: MediaServiceConfig) {
        this.collection = db.collection<Media>(COLLECTION);
    }

    async uploadMedia(transfer: CreateTransferResult): Promise<Media[]> {
        if (!transfer.projectId) {
            throw createInvalidAppStateError(`No project id for upload media transfer '${transfer._id}'`);
        }

        const files = transfer.files;
        try {
            const media = files.map(file => this.convertFileToMedia(transfer.projectId!, file));
            await this.collection.insertMany(media);
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getProjectMedia(projectId: string): Promise<Media[]> {
        try {
            const media = await this.collection.find({ projectId: projectId }).toArray();
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getMediaById(projectId: string, id: string): Promise<MediaWithFile> {
        try {
            const medium = await this.collection.findOne({ projectId: projectId, _id: id });
            if (!medium) {
                throw createResourceNotFoundError();
            }

            const version = medium.versions.find(v => v._id === medium.preferredVersionId);
            if (!version) {
                throw createInvalidAppStateError(`Could not find preferred verson '${medium.preferredVersionId}' for media '${medium._id}'`);
            }

            // find the file
            const file = await this.config.transfers.getMediaFile(version.fileId);

            return { ...medium, file }
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private convertFileToMedia(projectId: string, file: CreateTransferFileResult) {
        const initialVersion: MediaVersion = {
            ...createPersistedModel(this.authContext.user._id),
            fileId: file._id,
            // TODO: handle folder paths later
            name: file.name.split('/').at(-1)!,
        }

        const media: Media = {
            ...createPersistedModel(this.authContext.user._id),
            preferredVersionId: initialVersion._id,
            versions: [initialVersion],
            name: initialVersion.name,
            projectId: projectId
        }

        return media;
    }
}

export type IMediaService = Pick<MediaService, 'uploadMedia'|'getMediaById'|'getProjectMedia'>;

export interface MediaWithFile extends Media {
    file: DownloadTransferFileResult
}