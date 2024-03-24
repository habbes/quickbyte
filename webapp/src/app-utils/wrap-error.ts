import { logger } from "./logger.js";
import { showToast } from "./toast";
import { auth } from "./auth.js";

export async function wrapError(
    fn: () => Promise<void>,
    args?: {
        onError?: (error: any) => unknown,
        finally?: () => unknown,
    }) {
    try {
        await fn();
    } catch (e: any) {
        showToast(e.message, 'error');
        logger.error(e.message, e);
        args?.onError && args.onError(e);
        if (/Invalid token/.test(e.message)) {
            auth.signOut();
        }
    } finally {
        args?.finally && args.finally();
    }
}