import { AppError } from './error.js';
import { IAlertService, createServerErrorEmail } from './services/index.js';

/**
 * Starts a background service that periodically
 * sends an email notification alert of app errors.
 * @param alertService 
 */
export function initBackgroundErrorNotificationService(alertService: IAlertService) {
    // send alerts periodically if there are 500-level errors
    let queuedErrors: AppError[] = [];
    const interval = 5 * 60 * 1000; // 5min
    setInterval(() => {
        if (queuedErrors.length == 0) {
            return;
        }

        const alertMessage = createServerErrorEmail(queuedErrors);
        alertService.sendNotification('Server errors occurred in the last 5 minutes.', alertMessage)
        .catch(e => { console.error('Failed to send server errors alert', e)});
    }, interval);

    return {
        alertError(error: AppError) {
            queuedErrors.push(error);
        }
    };
}
