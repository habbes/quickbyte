import { initTRPC, TRPCError } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { AppServices } from "../core/index.js";

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async function requireAuth({ ctx, next }) {
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token. Please sign in and try again.' });
    }

    return next({
        ctx: {
            user: ctx.user,
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
            user
        }
    }
}

export type TrpcContext = Awaited<ReturnType<ReturnType<typeof createContextFactory>>>;