import { router, publicProcedure, protectedProcedure } from './trpc.js';
import { DeclineInviteArgs, AcceptInviteArgs } from '@quickbyte/common';
import { z } from 'zod';

export const appRouter = router({
    getCurrentUserData: protectedProcedure.query(({ ctx }) =>
        ctx.app.accounts.getUserData(ctx.auth)),
    
    declineInvite: publicProcedure
    .input(DeclineInviteArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.auth.declineUserInvite(input.code, input.email)),
    // TODO: acceptInvite should only use secret code
    acceptInvite: publicProcedure
    .input(AcceptInviteArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.auth.acceptUserInvite(input)),
    
    verifyInvite: publicProcedure
    .input(z.string())
    .query(({ input, ctx }) => 
        ctx.app.auth.verifyInvite(input))
    
});

export type AppRouter = typeof appRouter;
