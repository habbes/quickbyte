import { ErrorRequestHandler, RequestHandler, Response, NextFunction } from "express";
import { AppError, createValidationError, createResourceNotFoundError, createAuthError, createAppError, AppServices } from "../core/index.js";
import { AppRequest } from "./types.js";
import { sendErrorResponse, sendServerError } from "./util.js";

/**
 * This middleware handles errors from requests
 * and an error response with a corresponding
 * status code.
 * 
 * Request handlers should not handle errors.
 * This global error handler should be used instead.
 */
export const errorHandler = (): ErrorRequestHandler =>
    (error: AppError, req, res, next) => {
        // TODO: proper logging
        console.error(error);
        switch (error.code) {
            case 'resourceNotFound':
                return sendErrorResponse(res, 404, error);
            case 'resourceConflict':
                return sendErrorResponse(res, 409, error);
            case 'validationError':
                return sendErrorResponse(res, 400, error);
            case 'authenticationError':
                return sendErrorResponse(res, 401, error);
            case 'permissionDenied':
                return sendErrorResponse(res, 403, error);
            case 'subscriptionRequired':
            case 'subscriptionInsufficient':
                return sendErrorResponse(res, 402, error);
            default:
                if (error instanceof SyntaxError) {
                    return sendErrorResponse(res, 400,
                    createValidationError(`Invalid syntax in request body: ${error.message}`));
                }

                return sendServerError(res);
        }
    };

/**
 * This returns a 404 error if a route that does
 * not exist is requested
 * @param message error message used in the error response
 */
export const error404handler = (message: string): RequestHandler =>
    (req, res) => sendErrorResponse(res, 404, createResourceNotFoundError(message));

/**
 * This ensures that a user is authenticated before
 * proceeding with the request, otherwise returns a 401
 * error response.
 * 
 * This should be used on routes where authentication is required.
 */
export const requireAuth = (): RequestHandler =>
    // @ts-ignore
    async (req: AppRequest, res, next) => {
        const token = req.get('Authorization')?.split(/\s+/g)[1] || '';
        if (!token) {
            return next(createAuthError("Missing access token."));
        }
        try {
            const now = Date.now();
            await req.services.auth.verifyToken(token);
            const user = await req.services.auth.getUserByToken(token);
            req.authContext = { user };
            next();
        }
        catch (e) {
            next(e);
        }
    }

// TODO: permissions should probably be handled on top
// of services or commands, and not by http middleware
export const requireAccountOwner = (): RequestHandler =>
    // @ts-ignore
    async (req: AppRequest, res: Response, next: NextFunction) => {
        if (!req.params.accountId) {
            return next(createAppError("This route does not have an accountId param."
                + " The account owner middleware only supports routes with an `accountId` path segment."));
        }

        if (req.authContext.user.account._id !== req.params.accountId) {
            return next(createResourceNotFoundError());
        }

        return next();
    }

/**
 * This middleware calls the specified handler function and sends its return value
 * as the API response. It also sends errors from the function to the API error handler.
 *
 * this middleware was created to make it easier to write most handler functions, since
 * they happened to follow a common pattern
 *
 * @example
 * // the following code
 * router.get('endpoint/:id', (req, res, next) => {
 *   getById(req.params.id)
 *      .then(data => res.status(200).send(data))
 *      .catch(next);
 * });
 *
 * // can be rewritten as follows using this wrapResponse
 * router.get('endpoint/:id', wrapResponse((req) => getById(req.params.id)));
 *
 * @param handler
 * @param statusCode status code to send on success
 */
export function wrapResponse(handler: WrappedHandler, statusCode = 200): RequestHandler {
    // @ts-ignore
    return (req: AppRequest, res, next) =>
        handler(req).then(result => res.status(statusCode).send(result))
            .catch(next);
}

interface WrappedHandler {
    (req: AppRequest): Promise<any>;
}

export function injectServices(services: AppServices): RequestHandler {
    // TODO: This causes an issue cause AppRequest contains
    // extra properties not in Request
    // @ts-ignore
    return (req: AppRequest, res, next) => {
        req.services = services;
        next();
    }
}