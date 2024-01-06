import { Express } from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { AppServices } from '../core/index.js';
import { createContextFactory } from './context.js';
import { appRouter } from './router.js';
import { handleTrpcError } from './trpc-error.js';

export function mountTrpc(server: Express, trpcRoot: string, services: AppServices) {
    server.use(trpcRoot, createExpressMiddleware({
        router: appRouter,
        createContext: createContextFactory(services),
        onError({ error, ctx }) {
            if (!ctx) {
                return error;
            }

            return handleTrpcError(error, ctx);
        },
    }));
}
