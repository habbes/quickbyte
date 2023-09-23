import express from 'express';
import morgan from 'morgan';
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";
import { AppConfig } from '../core/config.js';

export function createServer(config: AppConfig) {
    const server = express();

    if (config.enableSentry) {
        Sentry.init({
            dsn: config.sentryDsn,
            integrations: [
                // enable HTTP calls tracing
                new Sentry.Integrations.Http({ tracing: true }),
                // enable Express.js middleware tracing
                new Sentry.Integrations.Express({ app: server }),
                new ProfilingIntegration(),
            ],
            // Performance Monitoring
            tracesSampleRate: 0.2, // Capture 100% of the transactions, reduce in production!
            // Set sampling rate for profiling - this is relative to tracesSampleRate
            profilesSampleRate: 0.2, //
        });
    }

    // The request handler must be the first middleware on the app
    server.use(Sentry.Handlers.requestHandler());

    // TracingHandler creates a trace for every incoming request
    server.use(Sentry.Handlers.tracingHandler());

    server.use(morgan(('short')));

    server.get('/status', (req, res) => {
        res.status(200).json({ ok: true });
    });

    server.use(Sentry.Handlers.errorHandler());

    return server;
}