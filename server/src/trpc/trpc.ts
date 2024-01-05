import { initTRPC, TRPCError } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { AppServices } from "../core/index.js";
import superjson from "superjson";

const t = initTRPC.context<TrpcContext>().create({
    transformer: superjson
});

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async function requireAuth({ ctx, next }) {
    if (!ctx.auth) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token. Please sign in and try again.' });
    }

    const user = ctx.auth.user;
    // this additional check is to get Typescript
    // to infer the user will never be undefined passed this point
    // so protectedProcedures are guaranteed to have a defined user
    // at compile time.
    if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token. Please sign in and try again.' });
    }

    return next({
        ctx: {
            auth: { user },
            app: ctx.app
        }
    });
})

export function createContextFactory(app: AppServices) {
    
    return async function createContext({ req, res }: CreateExpressContextOptions) {
        const token = req.get('Authorization')?.split(/\s+/g)[1] || '';
        if (!token) {
            return { app };
        }

        let user = undefined;

        try {
            user = await app.auth.verifyTokenAndGetUser(token);
        } catch {

        }

        return {
            app,
            auth: { user }
        }
    }
}

export type TrpcContext = Awaited<ReturnType<ReturnType<typeof createContextFactory>>>;