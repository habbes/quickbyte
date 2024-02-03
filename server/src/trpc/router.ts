import { router, publicProcedure, protectedProcedure } from './trpc.js';
import { DeclineInviteArgs, AcceptInviteArgs, UpdateMediaArgs, DeleteMediaArgs, CheckUserAuthMethodArgs } from '@quickbyte/common';
import { query } from 'express';
import { z } from 'zod';

export const appRouter = router({
    getCurrentUserData: protectedProcedure.query(({ ctx }) =>
        ctx.app.accounts.getUserData(ctx.auth)),
    
    getProjectMembers: protectedProcedure
    .input(z.string())
    .query(({ ctx, input }) =>
        ctx.app.accounts.projects(ctx.auth).getMembers(input)),
    
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
        ctx.app.auth.verifyInvite(input)),
    
    updateMedia: protectedProcedure
    .input(UpdateMediaArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).updateMedia(input.projectId, input)),
    
    deleteMedia: protectedProcedure
    .input(DeleteMediaArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).deleteMedia(input.projectId, input.id)),
    
    getUserAuthMethod: publicProcedure
    .input(CheckUserAuthMethodArgs)
    .query(({ input, ctx }) => 
        ctx.app.auth.getAuthMethod(input)),
    
});

export type AppRouter = typeof appRouter;
