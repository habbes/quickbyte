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

