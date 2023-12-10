import { MongoError } from "mongodb";

export class AppError extends Error {
    constructor(message: string, readonly code: ErrorCode) {
        super(message);
    }
}

export type ErrorCode = 
    // Generic app error. Use this when no other error code fits
    'appError'
    | 'resourceNotFound'
    | 'validationError'
    | 'resourceConflict'
    | 'permissionDenied'
    | 'authenticationError'
    | 'dbError'
    | 'subscriptionRequired'
    | 'subscriptionInsufficient'
    // When the app is an state that should never occur
    // and that could point to an undetected logic error
    | 'invalidAppState';

/**
 * Checks whether the error is a MongoDB duplicate key error
 * If a key is provided, then it also checks whether that was the key
 * that triggered the duplicate error.
 * @param error
 * @param key
 */
export function isMongoDuplicateKeyError(error: MongoError, key?: any): boolean {
    const MONGO_ERROR_DUPLICATE_KEY = 11000;

    if (error.code !== MONGO_ERROR_DUPLICATE_KEY) {
        return false;
    }
    
    if (typeof key === 'undefined') {
        return true;
    }

    return error.message.includes(key);
}

export type ErrorMessage = string | { message: string };

export const getErrorMessage = (message: ErrorMessage) => typeof message === 'string' ? message : message.message;

export function createAppError(message: ErrorMessage, code: ErrorCode = 'appError') {
    return new AppError(getErrorMessage(message), code);
}

export function isAppError(e: unknown): boolean {
    return e instanceof AppError;
}

export function rethrowIfAppError(e: unknown) {
    if (isAppError(e)) throw e;
}


export const createDbError =
    (message: ErrorMessage) => createAppError(message, 'dbError');

export const createResourceNotFoundError =
    (message: ErrorMessage = "Resource does not exist or you do not have sufficient permissions.") => createAppError(message, 'resourceNotFound');

/**
 * Creates a permission-related error.
 * **Note**: Prefer using `createResourceNotFoundError` for permission
 * errors where some resource or operation is not accessible due to insufficient
 * permissions. Use this error only in contexts where a "resourceNotFound" doesn't make sense.
 * @param message 
 */
export const createPermissionError =
    (message: ErrorMessage) => createAppError(message, 'permissionDenied');

export const createResourceConflictError =
    (message: ErrorMessage) => createAppError(message, 'resourceConflict');

export const createValidationError = (message: ErrorMessage) => createAppError(message, 'validationError');

export const createAuthError = (message: ErrorMessage) => createAppError(message, 'authenticationError');

export const createSubscriptionRequiredError =
    (message: ErrorMessage = 'This operation requires an active subscription. Please purchase a subscription plan and try again.') => createAppError(message, 'subscriptionRequired');

export const createSubscriptionInsufficientError =
    (message: ErrorMessage = 'Your active subscription does not support this operation. Please upgrade your plan and try again.') => createAppError(message,
        'subscriptionInsufficient');

export const createInvalidAppStateError =
    (message: ErrorMessage = 'Invalid app state detected.') => createAppError(message, 'invalidAppState');
