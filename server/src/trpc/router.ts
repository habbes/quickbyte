import { BasicUserData } from '@quickbyte/common';
import { router, publicProcedure, protectedProcedure } from './trpc.js';

export const appRouter = router({
    getCurrentUserData: protectedProcedure.query(({ ctx }) =>
        ctx.app.accounts.getUserData(ctx.auth)),
});

export type AppRouter = typeof appRouter;
