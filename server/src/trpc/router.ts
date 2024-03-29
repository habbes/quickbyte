import { router, publicProcedure, protectedProcedure } from './trpc.js';
import { DeclineInviteArgs, AcceptInviteArgs, UpdateMediaArgs, DeleteMediaArgs, CheckUserAuthMethodArgs, CreateUserArgs, VerifyUserEmailArgs, RequestUserVerificationEmailArgs, LoginRequestArgs, PasswordResetArgs, LoginWithGoogleRequestArgs, CreateMediaCommentArgs, DeleteMediaCommentArgs, UpdateMediaCommentArgs, InitTransferFileUploadArgs, CompleteFileUploadArgs, UpdateProjectArgs, ChangeProjectMemberRoleArgs, RemoveProjectMemberArgs, CreateFolderArgs, UpdateFolderArgs, GetProjectItemsArgs, CreateProjectMediaUploadArgs, CreateShareableTransferArgs, FinalizeTransferArgs, DeleteFolderArgs, SearchProjectFolderArgs, MoveFolderToFolderArgs, MoveMediaToFolderArgs, DeleteProjectItemsArgs } from '@quickbyte/common';
import { z } from 'zod';

export const appRouter = router({
    createUser: publicProcedure
    .input(CreateUserArgs)
    .mutation(({ ctx, input }) =>
        ctx.app.auth.createUser(input)),

    getCurrentUserData: protectedProcedure.query(({ ctx }) =>
        ctx.app.accounts.getUserData(ctx.auth)),
    
    login: publicProcedure
    .input(LoginRequestArgs)
    .mutation(({ ctx, input }) =>
        ctx.app.auth.login(input)),
    
    // we should probably have one login endpoint
    // that takes a provider and relevant credentials
    loginWithGoogle: publicProcedure
    .input(LoginWithGoogleRequestArgs)
    .mutation(({ ctx, input }) =>
        ctx.app.auth.loginWithGoogle(input)),
    
    logout: publicProcedure
    .input(z.string())
    // The reason we require passing the token manually as input
    // instead of using a protectedProcedure and referring to the ctx auth token
    // is because the token may be have expired and the protected procedure
    // will return a 401, which may lead to a confusing user experience
    .mutation(({ ctx, input }) =>
        ctx.app.auth.logoutToken(input)),
    
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
    
    changeProjectMemberRole: protectedProcedure
    .input(ChangeProjectMemberRoleArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).changeMemberRole(input.projectId, input)),
    
    removeProjectMember: protectedProcedure
    .input(RemoveProjectMemberArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).removeMember(input.projectId, input)),

    updateProject: protectedProcedure
    .input(UpdateProjectArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).updateProject(input.id, input)),
    
    getProjectItems: protectedProcedure
    .input(GetProjectItemsArgs)
    .query(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).getItems(input.projectId, input)),
    
    uploadProjectMedia: protectedProcedure
    .input(CreateProjectMediaUploadArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).uploadMedia(input.projectId, input)),
    
    updateMedia: protectedProcedure
    .input(UpdateMediaArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).updateMedia(input.projectId, input)),
    
    deleteMedia: protectedProcedure
    .input(DeleteMediaArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).deleteMedia(input.projectId, input.id)),
    
    createMediaComment: protectedProcedure
    .input(CreateMediaCommentArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).createMediaComment(input.projectId, input.mediaId, input)),
    
    deleteMediaComment: protectedProcedure
    .input(DeleteMediaCommentArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).deleteMediaComment(input.projectId, input.mediaId, input.commentId)),
    
    updateMediaComment: protectedProcedure
    .input(UpdateMediaCommentArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).updateMediaComment(input.projectId, input.mediaId, input.commentId, input)),
    
    createFolder: protectedProcedure
    .input(CreateFolderArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).createFolder(input.projectId, input)),
    
    updateFolder: protectedProcedure
    .input(UpdateFolderArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).updateFolder(input.projectId, input)),
    
    deleteFolder: protectedProcedure
    .input(DeleteFolderArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).deleteFolder(input.projectId, input.id)),
    
    searchProjectFolders: protectedProcedure
    .input(SearchProjectFolderArgs)
    .query(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).searchProjectFolders(input)),
    
    moveFolderToFolder: protectedProcedure
    .input(MoveFolderToFolderArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).moveFolderToFolder(input)),
    
    moveMediaToFolder: protectedProcedure
    .input(MoveMediaToFolderArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).moveMediaToFolder(input)),
    
    deleteProjectItems: protectedProcedure
    .input(DeleteProjectItemsArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).deleteProjectItems(input)),
    
    createTransfer: protectedProcedure
    .input(CreateShareableTransferArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.transfers(ctx.auth).create(input)),
    
    finalizeTransfer: protectedProcedure
    .input(FinalizeTransferArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.transfers(ctx.auth).finalize(input.transferId, input)),
    
    initTransferFileUpload: protectedProcedure
    .input(InitTransferFileUploadArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.transfers(ctx.auth).initFileUpload(input)),
    
    completeTransferFileUpload: protectedProcedure
    .input(CompleteFileUploadArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.transfers(ctx.auth).completeFileUpload(input)),
    
    getUserAuthMethod: publicProcedure
    .input(CheckUserAuthMethodArgs)
    .query(({ input, ctx }) => 
        ctx.app.auth.getAuthMethod(input)),
    
    verifyUserEmail: publicProcedure
    .input(VerifyUserEmailArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.auth.verifyUserEmail(input)),

    requestEmailVerification: publicProcedure
    .input(RequestUserVerificationEmailArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.auth.requestUserVerificationEmail(input)),
    
    resetPassword: publicProcedure
    .input(PasswordResetArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.auth.resetPassword(input)),
    
});

export type AppRouter = typeof appRouter;
