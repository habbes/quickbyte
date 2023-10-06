import { EmailHandler } from "./index.js";
import { SmsHandler } from "./sms/index.js";

export interface AdminAlertsServiceConfig {
    smsRecipient: string;
    smsHandler: SmsHandler;
    emailHandler: EmailHandler;
    emailRecipient: string;
}

/**
 * Used to send critical or important alerts
 * to the system admins.
 */
export class AdminAlertsService {
    constructor(private config: AdminAlertsServiceConfig) {
    }

    async sendNotification(subject: string, message: string): Promise<void> {
        // TODO: add SMS if necessary
        await Promise.all([
            this.config.emailHandler.sendEmail({
                to: { email: this.config.emailRecipient },
                subject: `Quickbyte Admin Alert: ${subject}`,
                message: message
            })
        ]);
    }
}

export type IAlertService = Pick<AdminAlertsService, 'sendNotification'>;
