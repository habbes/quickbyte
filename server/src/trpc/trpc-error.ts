import { DefaultErrorShape, TRPCError } from '@trpc/server';
import { AppError, ErrorCode } from '../core/index.js';
import { TrpcContext } from './context.js';
import { getHTTPStatusCodeFromError } from '@trpc/server/http';

export function handleTrpcError(error: TRPCError, ctx: TrpcContext) {
    console.error(error);
    // by default, trpc will throw a TRPCError for any error
    // that occurs within a trpc procedure.
    // So we use the cause attribute to find the original error
    const originalError = error.cause;
    if (originalError instanceof AppError) {
        handleAppError(originalError, ctx);
    }
}

export function formatTrpcError(error: TRPCError, shape: DefaultErrorShape) {
    const convertedError = error.cause instanceof AppError ? convertAppError(error.cause) : error;
    return {
        ...shape,
        data: {
            ...shape.data,
            code: convertedError.code,
            httpStatus: getHTTPStatusCodeFromError(convertedError),
            appCode: (convertedError.cause && convertedError.cause instanceof AppError) ?
                convertedError.cause.code
                : 'appError' as ErrorCode
        }
    }
}

function handleAppError(error: AppError, ctx: TrpcContext) {
    if (error.code === 'appError' || error.code === 'dbError' || error.code === 'invalidAppState') {
        ctx.alertError(error);
    }
}

function convertAppError(error: AppError) {
    switch (error.code) {
        case 'resourceNotFound':
            return new TRPCError({
                code: 'NOT_FOUND',
                message: error.message,
                cause: error,
                
            });
        case 'resourceConflict':
            return new TRPCError({
                code: 'CONFLICT',
                message: error.message,
                cause: error
            });
        case 'validationError':
            return new TRPCError({
                code: 'BAD_REQUEST',
                message: error.message,
                cause: error
            });
        case 'authenticationError':
            return new TRPCError({
                code: 'UNAUTHORIZED',
                message: error.message,
                cause: error
            });
        case 'permissionDenied':
            return new TRPCError({
                code: 'FORBIDDEN',
                message: error.message,
                cause: error
            });
        case 'subscriptionRequired':
        case 'subscriptionInsufficient':
            return new TRPCError({
                code: 'FORBIDDEN',
                message: error.message,
                cause: error
            });
        default:
            return new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Server error occurred.',
                cause: error
            });
    }
}
