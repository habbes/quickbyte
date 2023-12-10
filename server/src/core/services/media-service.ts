import { Db, Collection } from "mongodb";
import { AuthContext, Project, createPersistedModel, Media, MediaVersion } from "../models.js";
import { rethrowIfAppError, createAppError, createSubscriptionRequiredError, createResourceNotFoundError } from "../error.js";
import { CreateTransferFileResult, CreateTransferResult, ITransactionService } from "./index.js";
import { IInviteService } from "./invite-service.js";

const COLLECTION = 'media';

export class MediaService {
    private collection: Collection<Media>;

    constructor(private db: Db, private authContext: AuthContext, private projectId: string) {
        this.collection = db.collection<Media>(COLLECTION);
    }

    async uploadMedia(transfer: CreateTransferResult): Promise<Media[]> {
        const files = transfer.files;
        try {
            const media = files.map(file => this.convertFileToMedia(file));
            await this.collection.insertMany(media);
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getProjectMedia(): Promise<Media[]> {
        try {
            const media = await this.collection.find({ projectId: this.projectId }).toArray();
            return media;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private convertFileToMedia(file: CreateTransferFileResult) {
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
            projectId: this.projectId
        }

        return media;
    }
}

export type IMediaService = Pick<MediaService, 'uploadMedia'>;
