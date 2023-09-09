
type ErrorCode =
    'appError' |
    'operationCancelled';

export class AppError extends Error {
    constructor(message: string, readonly code: ErrorCode = 'appError') {
        super(message);
    }
}

export function createOperationCancelledError(message: string) {
    return new AppError(message, 'operationCancelled');
}

export function isOperationCancelledError(e: any) {
    return e instanceof AppError && e.code === 'operationCancelled';
}