import { Db, Collection, UpdateFilter } from "mongodb";
import { EmailHandler } from "./email/index.js";
import { PreviewUser, SystemPrincipal, createPersistedModel } from "../models.js";
import { createAppError, rethrowIfAppError } from "../error.js";

// TODO: this service should be removed after the preview
const COLLECTION = 'preview_users';

export interface PreviewUsersServiceConfig {
    emailHandler: EmailHandler;
}

export class PreviewUsersService {
    private collection: Collection<PreviewUser>;

    constructor(db: Db, private config: PreviewUsersServiceConfig) {
        this.collection = db.collection(COLLECTION);
    }

    async createPreviewUser(args: CreatePreviewUserArgs): Promise<void> {
        try {
            const user: PreviewUser = {
                ...createPersistedModel(SystemPrincipal),
                email: args.email,
                countryCode: args.countryCode,
                userAgent: args.userAgent
            };

            await this.collection.insertOne(user);

            await this.config.emailHandler.sendEmail({
                to: { email: user.email },
                subject: 'Welcome to Quickbyte Preview',
                message: 'This is a test'
            });
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export type IPreviewUserService = Pick<PreviewUsersService, 'createPreviewUser'>;

export interface CreatePreviewUserArgs {
    email: string;
    userAgent?: string;
    countryCode?: string;
}