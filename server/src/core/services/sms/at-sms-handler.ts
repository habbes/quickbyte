import Africastalking from 'africastalking';
import { SmsHandler } from './types.js';
import { createAppError } from '../../error.js';

export interface AtSmsHandlerConfig {
    username: string;
    apiKey: string;
    sender: string;
}

export class AtSmsHandler implements SmsHandler {
    private sender: string;
    private sms: ReturnType<typeof Africastalking>['SMS'];

    constructor(config: AtSmsHandlerConfig) {
        this.sender = config.sender;
        this.sms = Africastalking({
            apiKey: config.apiKey,
            username: config.username
        }).SMS;
    }
    
    async sendSms(to: string, message: string): Promise<void> {
        try {
            await this.sms.send({
                to: [to],
                message,
                from: this.sender
            });
        } catch (e: any) {
            throw createAppError(e);
        }
    }
}