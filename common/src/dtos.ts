import { z } from "zod";

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
    accountId: z.string().min(1)
});

export type CreateTransferArgs = z.infer<typeof CreateTransferArgs>;

export const CreateProjectMediaUploadArgs = z.object({
    provider: z.string().min(1),
    region: z.string().min(1),
    /**
     * When media id is provided, the files
     * will be uploaded as versions of an existing
     * media instead of creating new media
     */
    mediaId: z.optional(z.string()),
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
    text: z.string().min(1),
    timestamp: z.number().optional(),
    parentId: z.string().optional()
});

export type CreateMediaCommentArgs = z.infer<typeof CreateMediaCommentArgs>;

export const DeleteMediaCommentArgs = z.object({
    projectId: z.string().min(1),
    mediaId: z.string().min(1),
    commentId: z.string().min(1)
});

export type DeleteMediaCommentArgs = z.infer<typeof DeleteMediaCommentArgs>;
