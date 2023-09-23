import { SmsHandler } from "./types.js";

export class LocalSmsHandler implements SmsHandler {
    sendSms(to: string, message: string): Promise<void> {
        console.log('Send SMS to:', to);
        console.log('Message:');
        console.log(message);
        console.log();
        return Promise.resolve();
    }
}