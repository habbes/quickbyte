import { z } from "zod";
import { DownloadTransferFileResult, FolderPathEntry, ProjectShareItem, FrameAnnotationCollection, Media } from "./models.js";

export const DeclineInviteArgs = z.object({
    code: z.string(),
    email: z.string()
});

export type DeclineInviteArgs = z.infer<typeof DeclineInviteArgs>;

export const AcceptInviteArgs = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
});

export type AcceptInviteArgs = z.infer<typeof AcceptInviteArgs>;

export const UpdateMediaArgs = z.object({
    projectId: z.string().min(1),
    id: z.string().min(1),
    // since name is the only thing we can update at the moment,
    // an update request must provide a name
    name: z.string().min(1)
});

export type UpdateMediaArgs = z.infer<typeof UpdateMediaArgs>;

export const DeleteMediaArgs = z.object({
    projectId: z.string().min(1),
    id: z.string().min(1)
});

export type DeleteMediaArgs = z.infer<typeof DeleteMediaArgs>;

export const CreateTransferFileArgs = z.object({
    name: z.string().min(1),
    size: z.number()
});

export type CreateTransferFileArgs = z.infer<typeof CreateTransferFileArgs>;

export const CreateTransferMeta = z.object({
    ip: z.optional(z.string()),
    countryCode: z.optional(z.string()),
    state: z.optional(z.string()),
    userAgent: z.optional(z.string())
});

export type CreateTransferMeta = z.infer<typeof CreateTransferMeta>;

export const CreateShareableTransferArgs = z.object({
    name: z.string().min(1),
    provider: z.string().min(1),
    region: z.string().min(1),
    files: CreateTransferFileArgs.array(),
    meta: z.optional(CreateTransferMeta)
});

export type CreateShareableTransferArgs = z.infer<typeof CreateShareableTransferArgs>;

export const CreateTransferArgs = CreateShareableTransferArgs.extend({
    hidden: z.optional(z.boolean()),
    projectId: z.optional(z.string()),
    mediaId: z.optional(z.string()),
    folderId: z.optional(z.string()),
    accountId: z.string().min(1)
});

export type CreateTransferArgs = z.infer<typeof CreateTransferArgs>;

export const CreateProjectMediaUploadArgs = z.object({
    projectId: z.string(),
    provider: z.string().min(1),
    region: z.string().min(1),
    /**
     * When media id is provided, the files
     * will be uploaded as versions of an existing
     * media instead of creating new media
     */
    mediaId: z.optional(z.string()),
    /**
     * When folder id is set, the files will
     * be uploaded to this folder inside the project.
     * This field is ignored if `mediaId` is set.
     */
    folderId: z.optional(z.string()),
    files: CreateTransferFileArgs.array(),
    meta: z.optional(CreateTransferMeta)
});

export type CreateProjectMediaUploadArgs = z.infer<typeof CreateProjectMediaUploadArgs>;

export const CheckUserAuthMethodArgs = z.object({
    email: z.string().email()
});

export type CheckUserAuthMethodArgs = z.infer<typeof CheckUserAuthMethodArgs>;


export const CreateUserArgs = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(1)
});

export type CreateUserArgs = z.infer<typeof CreateUserArgs>;

export const VerifyUserEmailArgs = z.object({
    code: z.string().min(1),
    email: z.string().email().min(1)
});

export type VerifyUserEmailArgs = z.infer<typeof VerifyUserEmailArgs>;

export const RequestUserVerificationEmailArgs = z.object({
    email: z.string().email().min(1),
});

export type RequestUserVerificationEmailArgs = z.infer<typeof RequestUserVerificationEmailArgs>;

export const LoginRequestArgs = z.object({
    email: z.string().email(),
    password: z.string(),
    ip: z.string().optional(),
    countryCode: z.string().optional(),
    userAgent: z.string().optional()
});

export type LoginRequestArgs = z.infer<typeof LoginRequestArgs>;

export const PasswordResetArgs = VerifyUserEmailArgs.extend({
    password: z.string().min(1)
});

export type PasswordResetArgs = z.infer<typeof PasswordResetArgs>;

export const LoginWithGoogleRequestArgs = z.object({
    idToken: z.string().min(1),
    ip: z.string().optional(),
    countryCode: z.string().optional(),
    userAgent: z.string().optional()
});

export type LoginWithGoogleRequestArgs = z.infer<typeof LoginWithGoogleRequestArgs>;

export const CreateMediaCommentArgs = z.object({
    projectId: z.string().min(1),
    mediaId: z.string().min(1),
    mediaVersionId: z.string().min(1),
    text: z.string().optional(),
    timestamp: z.number().optional(),
    parentId: z.string().optional(),
    annotations: FrameAnnotationCollection.optional(),
});

export type CreateMediaCommentArgs = z.infer<typeof CreateMediaCommentArgs>;

export const DeleteMediaCommentArgs = z.object({
    projectId: z.string().min(1),
    mediaId: z.string().min(1),
    commentId: z.string().min(1)
});

export type DeleteMediaCommentArgs = z.infer<typeof DeleteMediaCommentArgs>;

export const UpdateMediaCommentArgs = z.object({
    projectId: z.string().min(1),
    mediaId: z.string().min(1),
    commentId: z.string().min(1),
    text: z.string().min(1)
});

export type UpdateMediaCommentArgs = z.infer<typeof UpdateMediaCommentArgs>;

export const SendEmailAnnouncementArgs = z.object({
    password: z.string().min(1),
    message: z.string().min(1),
    subject: z.string().min(1),
});

export type SendEmailAnnouncementArgs = z.infer<typeof SendEmailAnnouncementArgs>;

export const InitTransferFileUploadArgs = z.object({
    transferId: z.string().min(1),
    fileId: z.string().min(1),
    blockSize: z.number()
});

export type InitTransferFileUploadArgs = z.infer<typeof InitTransferFileUploadArgs>;

export const S3InitFileUploadResult = z.object({
    uploadId: z.string().optional(),
    blockSize: z.number(),
    size: z.number(),
    blocks: z.object({
        index: z.number(),
        size: z.number(),
        url: z.string(),
    }).array()
});

export type S3InitFileUploadResult = z.infer<typeof S3InitFileUploadResult>;

export const CompleteFileUploadArgs = z.object({
    transferId: z.string().min(1),
    fileId: z.string().min(1),
    providerArgs: z.any()
});

export type CompleteFileUploadArgs = z.infer<typeof CompleteFileUploadArgs>;

export const S3CompleteFileUploadProviderArgs = z.object({
    uploadId: z.string(),
    blocks: z.object({
        index: z.number(),
        etag: z.string()
    }).array()
});

export type S3CompleteFileUploadProviderArgs = z.infer<typeof S3CompleteFileUploadProviderArgs>;

export const S3CompleteFileUploadResult = z.object({
    etag: z.string()
});

export type S3CompleteFileUploadResult = z.infer<typeof S3CompleteFileUploadResult>;

export const UpdateProjectArgs = z.object({
    id: z.string().min(1),
    name: z.string().min(1)
});

export type UpdateProjectArgs = z.infer<typeof UpdateProjectArgs>;

export const DeleteProjectArgs = z.object({
    id: z.string().min(1)
});

export type DeleteProjectArgs = z.infer<typeof DeleteProjectArgs>;

export const ChangeProjectMemberRoleArgs = z.object({
    projectId: z.string().min(1),
    userId: z.string().min(1),
    role: z.enum(["reviewer", "editor", "admin"])
});

export type ChangeProjectMemmberRoleArgs = z.infer<typeof ChangeProjectMemberRoleArgs>;

export const RemoveProjectMemberArgs = z.object({
    projectId: z.string().min(1),
    userId: z.string().min(1)
});

export type RemoveProjectMemberArgs = z.infer<typeof RemoveProjectMemberArgs>;

export const CreateFolderArgs = z.object({
    projectId: z.string().min(1),
    name: z.string().min(1),
    parentId: z.optional(z.string().min(1))
});

export type CreateFolderArgs = z.infer<typeof CreateFolderArgs>;

export const CreateFolderTreeArgs = z.object({
    projectId: z.string().min(1),
    paths: z.array(z.string().min(1)),
});

export type CreateFolderTreeArgs = z.infer<typeof CreateFolderTreeArgs>;

export const GetProjectItemsArgs = z.object({
    projectId: z.string().min(1),
    folderId: z.optional(z.string().min(1))
});

export type GetProjectItemsArgs = z.infer<typeof GetProjectItemsArgs>;

export const UpdateFolderArgs = z.object({
    projectId: z.string().min(1),
    id: z.string().min(1),
    // Right now the name is required cause it's the only
    // thing that can be updated.
    // If we have other properties, we can make this optional
    name: z.string().min(1)
});

export type UpdateFolderArgs = z.infer<typeof UpdateFolderArgs>;


export const FinalizeTransferArgs = z.object({
    transferId: z.string().min(1),
    duration: z.number().gte(0),
    recovered: z.optional(z.boolean())
});

export type FinalizeTransferArgs = z.infer<typeof FinalizeTransferArgs>;

export const MoveMediaToFolderArgs = z.object({
    projectId: z.string().min(1),
    targetFolderId: z.union([z.string().min(1), z.null()]),
    mediaIds: z.array(z.string().min(1)).min(1),
});

export type MoveMediaToFolderArgs = z.infer<typeof MoveMediaToFolderArgs>;

export const MoveFoldersToFolderArgs = z.object({
    projectId: z.string().min(1),
    targetFolderId: z.union([z.string().min(1), z.null()]),
    folderIds: z.array(
        z.string().min(1)
    ).min(1)
});

export type MoveFoldersToFolderArgs = z.infer<typeof MoveFoldersToFolderArgs>;

export const SearchProjectFolderArgs = z.object({
    projectId: z.string().min(1),
    searchTerm: z.string()
});

export type SearchProjectFolderArgs = z.infer<typeof SearchProjectFolderArgs>;

export const MoveProjectItemsToFolderArgs = z.object({
    projectId: z.string().min(1),
    items: z.array(
        z.object({
            id: z.string().min(1),
            type: z.enum(['folder', 'media'])
        })
    ).min(1),
    targetFolderId: z.union([z.string().min(1), z.null()]),
});

export type MoveProjectItemsToFolderArgs = z.infer<typeof MoveProjectItemsToFolderArgs>;

export const DeleteProjectItemsArgs = z.object({
    projectId: z.string().min(1),
    items: z.array(
        z.object({
            id: z.string().min(1),
            type: z.enum(['folder', 'media'])
        })
    ).min(1)
});

export type DeleteProjectItemsArgs = z.infer<typeof DeleteProjectItemsArgs>;

export const GetProjectMediaByIdArgs = z.object({
    projectId: z.string().min(1),
    mediaId: z.string().min(1)
});

export type GetProjectMediaByIdArgs = z.infer<typeof GetProjectMediaByIdArgs>;

export const InviteUsersToProjectArgs = z.object({
    projectId: z.string().min(1),
    users: z.array(z.object({
        email: z.string().min(1)
    })).min(1),
    role: z.enum(['editor', 'admin', 'reviewer']),
    message: z.string().optional()
});

export type InviteUsersToProjectArgs = z.infer<typeof InviteUsersToProjectArgs>;

export const CreateProjectShareArgs = z.object({
    name: z.string().min(1),
    projectId: z.string().min(1),
    allowDownload: z.boolean().optional(),
    showAllVersions: z.boolean().optional(),
    allowComments: z.boolean().optional(),
    password: z.optional(z.string().min(1)),
    public: z.boolean(),
    allItems: z.optional(z.boolean()),
    items: z.array(z.object({
        _id: z.string().min(1),
        type: z.enum(['folder', 'media'])
    })),
    expiresAt: z.date().optional(),
    recipients: z.array(
        z.object({
            email: z.string().min(1)
        })
    ),
});

export type CreateProjectShareArgs = z.infer<typeof CreateProjectShareArgs>;

export const UpdateProjectShareArgs = z.object({
    projectId: z.string().min(1),
    shareId: z.string().min(1),
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    public: z.boolean().optional(),
    // if has password is set to true and password is null,
    // then the share will retain its current password if it has one,
    // otherwise password is not set.
    // If hasPassword is false, the current password will be removed
    // if one is set.
    hasPassword: z.boolean().optional(),
    password: z.string().min(1).optional(),
    expiresAt: z.date().optional(),
    allowComments: z.boolean().optional(),
    showAllVersions: z.boolean().optional(),
    allowDownload: z.boolean().optional(),
    recipients: z.array(
        z.object({
            email: z.string().min(1)
        })
    ).optional()
});

export type UpdateProjectShareArgs = z.infer<typeof UpdateProjectShareArgs>;

export const DeleteProjetShareArgs = z.object({
    projectId: z.string().min(1),
    shareId: z.string().min(1)
});

export type DeleteProjectShareArgs = z.infer<typeof DeleteProjetShareArgs>;

export const GetProjectShareLinkItemsArgs = z.object({
    shareId: z.string().min(1),
    code: z.string().min(1),
    password: z.string().min(1).optional(),
    folderId: z.string().min(1).optional()
});

export type GetProjectShareLinkItemsArgs = z.infer<typeof GetProjectShareLinkItemsArgs>;

export type GetProjectShareLinkItemsResult = ProjectShareLinkItemsRequirePasswordResult | ProjectShareLinkItemsSuccessResult;

export interface ProjectShareLinkItemsRequirePasswordResult {
    passwordRequired: true;
}

export interface ProjectShareLinkItemsSuccessResult {
    _id: string;
    name: string;
    sharedEmail?: string;
    allowDownload: boolean;
    allowComments: boolean;
    showAllVersions: boolean;
    items: ProjectShareItem[],
    path: FolderPathEntry[],
    sharedBy: { name: string, _id: string }
}

export interface ProjectShareLinkMediaItem {
    _id: string;
    name: string;
    path: string;
}

export const GetProjectShareMediaByIdArgs = z.object({
    shareId: z.string().min(1),
    shareCode: z.string().min(1),
    password: z.string().min(1).optional(),
    mediaId: z.string(),
});

export type GetProjectShareMediaByIdArgs = z.infer<typeof GetProjectShareMediaByIdArgs>;

export const CreateProjectShareMediaCommentArgs = z.object({
    authorName: z.string().min(1).optional(),
    shareId: z.string().min(1),
    shareCode: z.string().min(1),
    password: z.string().min(1).optional(),
    mediaId: z.string().min(1),
    mediaVersionId: z.string().min(1),
    text: z.string().optional(),
    timestamp: z.number().optional(),
    parentId: z.string().optional(),
    annotations: FrameAnnotationCollection.optional(),
});

export type CreateProjectShareMediaCommentArgs = z.infer<typeof CreateProjectShareMediaCommentArgs>;

export const UpdateProjectShareMediaCommentArgs = z.object({
    shareId: z.string().min(1),
    shareCode: z.string().min(1),
    password: z.string().min(1).optional(),
    mediaId: z.string().min(1),
    commentId: z.string().min(1),
    text: z.string().min(1)
});

export type UpdateProjectShareMediaCommentArgs = z.infer<typeof UpdateProjectShareMediaCommentArgs>;

export const DeleteProjectShareMediaCommentArgs = z.object({
    shareId: z.string().min(1),
    shareCode: z.string().min(1),
    password: z.string().min(1).optional(),
    mediaId: z.string().min(1),
    commentId: z.string().min(1)
});

export type DeleteProjectShareMediaCommentArgs = z.infer<typeof DeleteProjectShareMediaCommentArgs>;

export const GetAllProjectShareFilesForDownloadArgs = z.object({
    shareId: z.string().min(1),
    shareCode: z.string().min(1),
    password: z.string().min(1).optional()
});

export type GetAllProjectShareFilesForDownloadArgs = z.infer<typeof GetAllProjectShareFilesForDownloadArgs>;

export interface GetAllProjectShareFilesForDownloadResult {
    files: DownloadTransferFileResult[];
    errors?: GetAllProjectShareFilesForDownloadError[];
}

export interface GetAllProjectShareFilesForDownloadError {
    path: string;
    error: string;
}

export const UpdateMediaVersionsArgs = z.object({
    projectId: z.string().min(1),
    mediaId: z.string().min(1),
    preferredVersionId: z.string().min(1).optional(),
    // this updates the versions array, it's used
    // to rename, re-order or delete versions.
    // It essentially replaces the current version array.
    // As a result, we use the concurrency check to ensure
    // no concurrent updates occur. The update will only succeed
    // if the version that the client has is the most recent
    versions: z.array(
        z.object({
            _id: z.string().min(1),
            name: z.string().min(1)
        })
    ).optional(),
    // use to make sure we have the latest version of the record
    // before we make an update
    concurrencyControl: z.number().optional()
});

export type UpdateMediaVersionsArgs = z.infer<typeof UpdateMediaVersionsArgs>;

export const ExtractMediaVersionsArgs = z.object({
    projectId: z.string().min(1),
    mediaId: z.string().min(1),
    /**
     * List of IDs of versions to extract into separate files.
     * The media asset should remain with at least with version
     * after extraction otherwise operation will fail.
     */
    versionIds: z.array(z.string().min(1)).min(1),
    concurrencyControl: z.number().optional()
});

export type ExtractMediaVersionArgs = z.infer<typeof ExtractMediaVersionsArgs>;

export interface ExtractMediaVersionsResult {
    current: Media;
    extracted: Media[];
}