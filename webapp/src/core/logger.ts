import * as Sentry from '@sentry/vue';

export type LogLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";

export class Logger {
    message(level: LogLevel, ...messages: any[]) {
        // TODO: remove console.log in prod
        if (level === 'warning') {
            console.warn(...messages);
        } else if (level === 'error' || level === 'fatal') {
            console.error(...messages)
        } else {
            console.log(...messages);
        }

        if (['warning', 'fatal', 'error', 'info'].includes(level)) {
            Sentry.captureMessage(messages.join(' '), level);
        }
    }

    log(...messages: any[]) {
        this.message('log', ...messages);
    }

    error(message: string, e?: any) {
        this.message('error', message);
        if (e) {
            Sentry.captureException(e);
        }
    }

    warn(message: string) {
        this.message('warning', message);
    }

    info(message: string) {
        this.message('info', message);
    }

    debug(message: string) {
        this.message('debug', message);
    }
}