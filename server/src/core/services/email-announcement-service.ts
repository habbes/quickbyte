import { Database } from "../db/index.js";
import { createAppError, createResourceNotFoundError, rethrowIfAppError, createValidationError } from "../error.js";
import { UserInDb, SendEmailAnnouncementArgs } from "../models.js";
import { EmailHandler } from "./email/index.js";

export interface EmailAnnouncementConfig {
    email: EmailHandler;
    password: string;
}

// This class is a cheap, quick and dirty API to help me sound email announcement to users
// Down the road we should replace it with a proper solution for that use case
export class EmailAnnouncementService {
    constructor(private db: Database, private config: EmailAnnouncementConfig) {
    }

    public async sendAnnouncement(args: SendEmailAnnouncementArgs): Promise<void> {
        try {
            // this particular API is not exposed through trpc, so let's do
            // the validation manually
            const validationResult = SendEmailAnnouncementArgs.safeParse(args);
            if (!validationResult.success) {
                // since this is not an API that should exist, if a random
                // user or malicious attacker discovers it, let's not
                // give hints about why the request failed
                throw createResourceNotFoundError();
            }

            if (this.config.password !== args.password) {
                throw createResourceNotFoundError();
            }

            const users = await this.db.users().find<UserInDb>({}).toArray();
            for (let user of users) {
                // barebones templating :)
                // Hopefully by the time we need something more robust, we
                // won't be using this API for sending announcements :)
                const message = args.message.replaceAll("{name}", user.name);
                await this.config.email.sendEmail({
                    to: user,
                    subject: args.subject,
                    message: message
                });
            }
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}
