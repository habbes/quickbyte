import { SmsHandler } from "./sms/index.js";

export interface AdminAlertsServiceConfig {
    smsRecipient: string;
    smsHandler: SmsHandler;
}

/**
 * Used to send critical or important alerts
 * to the system admins.
 */
export class AdminAlertsService {
    constructor(private config: AdminAlertsServiceConfig) {
    }

    sendNotification(subject: string, message: string): Promise<void> {
        return this.config.smsHandler.sendSms(
            this.config.smsRecipient,
            `${subject}\n${message}`
        );
    }
}