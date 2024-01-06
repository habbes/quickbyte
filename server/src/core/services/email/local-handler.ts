import { EmailHandler, SendEmailArgs } from './types.js';

export class LocalEmailHandler implements EmailHandler {
    sendEmail(args: SendEmailArgs): Promise<void> {
        console.log('Sending Email');
        console.log('TO', args.to);
        console.log('Subject:', `[Quickbyte]: ${args.subject}`);
        console.log('Message:');
        console.log(args.message);
        console.log();
        return Promise.resolve();
    }
}