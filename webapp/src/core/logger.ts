import * as Sentry from '@sentry/vue';
import type { info } from 'console';

export type LogLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

export class Logger {
    log(message: string, level: LogLevel = 'log') {
        // TODO: remove console.log in prod
        if (level === 'warning') {
            console.warn(message);
        } else if (level === 'error' || level === 'fatal') {
            console.error(message)
        } else {
            console.log(message);
        }

        if (['warning', 'fatal', 'error', 'info'].includes(level)) {
            Sentry.captureMessage(message, level);
        }
    }

    error(message: string, e?: any) {
        this.log(message, 'error');
        if (e) {
            Sentry.captureException(e);
        }
    }

    warn(message: string) {
        this.log(message, 'warning');
    }

    info(message: string) {
        this.log(message, 'info');
    }

    debug(message: string) {
        this.log(message, 'debug');
    }
}