
import Mailjet from 'node-mailjet'
import { EmailHandler, SendEmailArgs } from './types.js';
import { createAppError } from '../../error.js';

export interface MailjetConfig {
    apiKey: string;
    apiSecret: string;
    sender: {
        email: string;
        name: string;
    }
}

export class MailjetEmailHandler implements EmailHandler {
    // @ts-ignore
    private client: Mailjet;
    private sender: { name: string, email: string };

    constructor(config: MailjetConfig) {

        // @ts-ignore
        this.client = new Mailjet({
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
        });

        this.sender = config.sender;
    }

    async sendEmail(args: SendEmailArgs): Promise<void> {
        try {
            await this.client
            .post('send', { version: 'v3.1'})
            .request({
                Messages: [
                    {
                        From: {
                            Email: this.sender.email,
                            Name: this.sender.name
                        },
                        To: {
                            Email: args.to.email,
                            Name: args.to.name
                        },
                        Subject: args.subject,
                        HTMLPart: args.message,
                        TextPart: args.message // TODO: automatically strip HTML
                    }
                ]
            });
        }
        catch (e: any) {
            throw createAppError(e);
        }
    }

}