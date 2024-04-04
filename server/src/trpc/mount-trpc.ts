import { Express, Router } from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { AppServices } from '../core/index.js';
import { createContextFactory } from './context.js';
import { appRouter } from './router.js';
import { handleTrpcError } from './trpc-error.js';

export function mountTrpc(server: Express, trpcRoot: string, services: AppServices) {
    const trpcExpressRouter = Router();
    trpcExpressRouter.use(cors());
    trpcExpressRouter.use("/", createExpressMiddleware({
        router: appRouter,
        createContext: createContextFactory(services),
        onError({ error, ctx }) {
            if (!ctx) {
                return error;
            }

            return handleTrpcError(error, ctx);
        },
    }));

    server.use(trpcRoot, trpcExpressRouter);
}
