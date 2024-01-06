import { z } from "zod";

export const DeclineInviteArgs = z.object({
    id: z.string(),
    email: z.string()
});

export type DeclineInviteArgs = z.infer<typeof DeclineInviteArgs>;
