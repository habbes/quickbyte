import { UserWithAccount } from '@quickbyte/common';
import { router, publicProcedure, protectedProcedure } from './trpc.js';

export const appRouter = router({
    getCurrentUserData: protectedProcedure.query<UserWithAccount>(async ({ ctx }) => {
        return Promise.resolve(ctx.auth.user)
    }),
});

export type AppRouter = typeof appRouter;
