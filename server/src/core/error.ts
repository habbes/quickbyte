import { MongoError } from "mongodb";

export class AppError extends Error {
    constructor(message: string, readonly code: ErrorCode) {
        super(message);
    }
}

export type ErrorCode = 
    // Generic app error. Use this when no other error code fits
    'appError'
    // Generic error caused by client or user. Use this when no
    // other error code is suitable, and the error is caused
    // by the client and the error message is safe to be seen
    // by the client
    | 'clientError'
    | 'resourceNotFound'
    | 'validationError'
    | 'resourceConflict'
    | 'permissionDenied'
    | 'authenticationError'
    | 'dbError';

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

export function createClientError(message: ErrorMessage, code: ErrorCode = 'clientError') {
    return new AppError(getErrorMessage(message), code);
}

export const createDbError =
    (message: ErrorMessage) => createAppError(message, 'dbError');

export const createResourceNotFoundError =
    (message: ErrorMessage) => createClientError(message, 'resourceNotFound');

export const createValidationError = (message: ErrorMessage) => createClientError(message, 'validationError');
