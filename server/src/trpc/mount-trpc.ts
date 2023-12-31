import { Express } from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

import { AppServices } from '../core/index.js';
import { createContextFactory, TrpcContext } from './trpc.js';
import { appRouter, AppRouter } from './router.js';

export function mountTrpc(server: Express, trpcRoot: string, services: AppServices) {
    server.use(trpcRoot, createExpressMiddleware({
        router: appRouter,
        createContext: createContextFactory(services)
    }));
}
