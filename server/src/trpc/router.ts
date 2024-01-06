import { router, publicProcedure, protectedProcedure } from './trpc.js';
import { DeclineInviteArgs, AcceptInviteArgs } from '@quickbyte/common';

export const appRouter = router({
    getCurrentUserData: protectedProcedure.query(({ ctx }) =>
        ctx.app.accounts.getUserData(ctx.auth)),
    
    declineInvite: publicProcedure
    .input(DeclineInviteArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.auth.declineUserInvite(input.id, input.email)),
    
    acceptInvite: publicProcedure
    .input(AcceptInviteArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.auth.acceptUserInvite(input))
    
});

export type AppRouter = typeof appRouter;
