import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { TrpcContext } from "./context.js";
import { formatTrpcError } from './trpc-error.js';
import { createAuthError } from "../core/error.js";

const t = initTRPC.context<TrpcContext>().create({
    transformer: superjson,
    errorFormatter: ({ error, shape }) => formatTrpcError(error, shape)
});

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async function requireAuth({ ctx, next }) {
    if (!ctx.auth) {
        throw createAuthError('Invalid token. Please sign in and try again.');
    }

    const user = ctx.auth.user;
    // this additional check is to get Typescript
    // to infer the user will never be undefined passed this point
    // so protectedProcedures are guaranteed to have a defined user
    // at compile time.
    if (!user) {
        throw createAuthError('Invalid token. Please sign in and try again.');
    }

    return next({
        ctx: {
            auth: { user },
            app: ctx.app,
            alertError: ctx.alertError
        }
    });
})
