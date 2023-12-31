import { router, publicProcedure, protectedProcedure } from './trpc.js';

export const appRouter = router({
    getCurrentUserData: protectedProcedure.query(async ({ ctx }) => {
        return Promise.resolve(ctx.user)
    })
});

export type AppRouter = typeof appRouter;
