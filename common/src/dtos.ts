import { z } from "zod";

export const DeclineInviteArgs = z.object({
    id: z.string(),
    email: z.string()
});

export type DeclineInviteArgs = z.infer<typeof DeclineInviteArgs>;

export const AcceptInviteArgs = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
});

export type AcceptInviteArgs = z.infer<typeof AcceptInviteArgs>;
