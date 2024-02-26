
// import Mailjet, { Client, SendEmailV3_1, LibraryResponse } from 'node-mailjet'
import mailjet from 'node-mailjet';
const { Client } = mailjet;
import { EmailHandler, SendEmailArgs } from './types.js';
import { createAppError } from '../../error.js';

// see: https://github.com/mailjet/mailjet-apiv3-nodejs#send-email-example

const HTML_TAGS_REGEX = /<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>/g;

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
    private client: mailjet.Client;
    private sender: { name: string, email: string };

    constructor(config: MailjetConfig) {

        this.client = new Client({
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
        });

        this.sender = config.sender;
    }

    async sendEmail(args: SendEmailArgs): Promise<void> {
        try {
            // @ts-ignore
            const data: mailjet.SendEmailV3_1.Body = {
                Messages: [
                    {
                        From: {
                            Email: this.sender.email,
                            Name: this.sender.name
                        },
                        To: [{
                            Email: args.to.email,
                            Name: args.to.name
                        }],
                        Subject: `Quickbyte - ${args.subject}`,
                        HTMLPart: args.message,
                        TextPart: removeHtmlTags(args.message)
                    }
                ]
            };

            const result = await this.client
            .post('send', { version: 'v3.1' })
            .request(data);
        }
        catch (e: any) {
            throw createAppError(e);
        }
    }

}

function removeHtmlTags(content: string): string {
    return content.replace(HTML_TAGS_REGEX, '');
}