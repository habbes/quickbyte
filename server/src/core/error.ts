
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
    | 'authenticationError';

export function createAppError(message: string, code: ErrorCode = 'appError') {
    return new AppError(message, code);
}

export function createClientError(message: string, code: ErrorCode = 'clientError') {
    return new AppError(message, code);
}

export const createResourceNotFoundError =
    (message: string) => createClientError(message, 'resourceNotFound');

export const createValidationError = (message: string) => createClientError(message, 'validationError');
