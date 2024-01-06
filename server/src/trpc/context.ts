import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { AppServices, IAlertService, initBackgroundErrorNotificationService } from "../core/index.js";

export function createContextFactory(app: AppServices) {

    const errorAlertService = initBackgroundErrorNotificationService(app.alerts);
    
    return async function createContext({ req, res }: CreateExpressContextOptions) {
        const token = req.get('Authorization')?.split(/\s+/g)[1] || '';
        if (!token) {
            return { app, alertError: errorAlertService.alertError };
        }

        let user = undefined;

        try {
            user = await app.auth.verifyTokenAndGetUser(token);
        } catch {

        }

        return {
            app,
            auth: { user },
            alertError: errorAlertService.alertError
        }
    }
}

export type TrpcContext = Awaited<ReturnType<ReturnType<typeof createContextFactory>>>;
