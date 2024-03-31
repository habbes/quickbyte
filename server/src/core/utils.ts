import { randomBytes } from 'crypto';
import { createAppError, rethrowIfAppError } from './error.js';

export function generateId() {
    return randomBytes(16).toString('base64url');
}


export async function wrapError<T>(fn: () => Promise<T>): Promise<T> {
    try {
        const result = await fn();
        return result;
    } catch (e: any) {
        rethrowIfAppError(e);
        throw createAppError(e);
    }
}