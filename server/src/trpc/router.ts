import { router, publicProcedure, protectedProcedure } from './trpc.js';
import {
    DeclineInviteArgs, AcceptInviteArgs, UpdateMediaArgs,
    CheckUserAuthMethodArgs, CreateUserArgs, VerifyUserEmailArgs,
    RequestUserVerificationEmailArgs, LoginRequestArgs, PasswordResetArgs,
    LoginWithGoogleRequestArgs, CreateMediaCommentArgs, DeleteMediaCommentArgs,
    UpdateMediaCommentArgs, InitTransferFileUploadArgs, CompleteFileUploadArgs,
    UpdateProjectArgs, ChangeProjectMemberRoleArgs, RemoveProjectMemberArgs,
    CreateFolderArgs, UpdateFolderArgs, GetProjectItemsArgs, CreateProjectMediaUploadArgs,
    CreateShareableTransferArgs, FinalizeTransferArgs, SearchProjectFolderArgs,
    DeleteProjectItemsArgs, MoveProjectItemsToFolderArgs, GetProjectMediaByIdArgs,
    InviteUsersToProjectArgs, CreateProjectShareArgs, UpdateProjectShareArgs,
    DeleteProjetShareArgs,
GetProjectShareLinkItemsArgs,
CreateProjectShareMediaCommentArgs,
DeleteProjectShareMediaCommentArgs,
UpdateProjectShareMediaCommentArgs,
GetProjectShareMediaByIdArgs,
GetAllProjectShareFilesForDownloadArgs
} from '@quickbyte/common';
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
    
    inviteUsersToProject: protectedProcedure
    .input(InviteUsersToProjectArgs)
    .mutation(({ ctx, input }) =>
        ctx.app.accounts.projects(ctx.auth).inviteUsers(input.projectId, input)),
    
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
    
    getProjectMediaById: protectedProcedure
    .input(GetProjectMediaByIdArgs)
    .query(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).getMediumById(input.projectId, input.mediaId)),
    
    uploadProjectMedia: protectedProcedure
    .input(CreateProjectMediaUploadArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).uploadMedia(input.projectId, input)),
    
    updateMedia: protectedProcedure
    .input(UpdateMediaArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).updateMedia(input.projectId, input)),
    
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
    
    searchProjectFolders: protectedProcedure
    .input(SearchProjectFolderArgs)
    .query(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).searchProjectFolders(input)),
    
    moveProjectItemsToFolder: protectedProcedure
    .input(MoveProjectItemsToFolderArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).moveProjectItemsToFolder(input)),
    
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
    
    createProjectShare: protectedProcedure
    .input(CreateProjectShareArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).createProjectShare(input)),
    
    getProjectShares: protectedProcedure
    .input(z.string())
    .query(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).getProjectShares(input)),
    
    updateProjectShare: protectedProcedure
    .input(UpdateProjectShareArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).updateProjectShare(input)),
    
    deleteProjectShare: protectedProcedure
    .input(DeleteProjetShareArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.accounts.projects(ctx.auth).deleteProjectShare(input)),
    
    getProjectShareItems: publicProcedure
    .input(GetProjectShareLinkItemsArgs)
    .query(({ input, ctx }) =>
        ctx.app.sharedProjects.getProjectShareItems(input)),

    getProjectShareMediaById: publicProcedure
    .input(GetProjectShareMediaByIdArgs)
    .query(({ input, ctx }) =>
        ctx.app.sharedProjects.getProjectShareMediaById(input)),
    
    createProjectShareMediaComment: publicProcedure
    .input(CreateProjectShareMediaCommentArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.sharedProjects.createProjectShareMediaComment(input)),
    
    deleteProjectShareMediaComment: publicProcedure
    .input(DeleteProjectShareMediaCommentArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.sharedProjects.deleteProjectShareMediaComment(input)),
    
    updateProjectShareMediaComment: publicProcedure
    .input(UpdateProjectShareMediaCommentArgs)
    .mutation(({ input, ctx }) =>
        ctx.app.sharedProjects.updateProjectShareMediaComment(input)),
    
    getAllProjectShareFilesForDownload: publicProcedure
    .input(GetAllProjectShareFilesForDownloadArgs)
    .query(({ input, ctx }) =>
        ctx.app.sharedProjects.getAllProjectShareFilesForDownload(input)),
    
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
