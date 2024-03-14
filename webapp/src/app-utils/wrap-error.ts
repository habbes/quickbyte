import { logger } from "./logger.js";
import { showToast } from "./toast";
import { auth } from "./auth.js";

export async function wrapError(fn: () => Promise<void>) {
    try {
        await fn();
    } catch (e: any) {
        showToast(e.message, 'error');
        logger.error(e.message, e);
        if (/Invalid token/.test(e.message)) {
            auth.signOut();
        }
    }
}