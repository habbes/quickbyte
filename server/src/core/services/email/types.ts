

export interface EmailHandler {
    sendEmail(args: SendEmailArgs): Promise<void>;
}

export interface SendEmailArgs {
    to: {
        name?: string;
        email: string;
    },
    subject: string;
    message: string;
}