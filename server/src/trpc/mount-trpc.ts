import { Express } from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';

import { AppServices } from '../core/index.js';
import { createContextFactory } from './trpc.js';
import { appRouter } from './router.js';

export function mountTrpc(server: Express, trpcRoot: string, services: AppServices) {
    server.use(trpcRoot, createExpressMiddleware({
        router: appRouter,
        createContext: createContextFactory(services)
    }));
}
