import { createHmac } from 'node:crypto';
import { Router, Request, Response, NextFunction} from 'express';
import { AppServices, createResourceNotFoundError } from '../core/index.js';
import { wrapResponse } from '../api/middleware.js';

export function createPaystackWebhooks(services: AppServices, secretKey: string): Router {
    const routes = Router();

    console.log('paystack routes', secretKey);

    routes.use(verificationEventOrigin(secretKey));

    routes.post('/', wrapResponse(async (req) =>
        req.services.transactions.handlePaystackEvent(req.body, req.services)))

    return routes;
}

function verificationEventOrigin(secretKey: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        console.log('Verifying paystack webhook...');
        if (isRequestPaystackVerified(req, secretKey)) {
            return next();
        }

        console.log(`Failed to verify paystack event signature. Request origin: '${req.ip}'`);
        const error = createResourceNotFoundError();
        next(error);
    }
}

function isRequestPaystackVerified(req: Request, secretKey: string) {
    // see: https://paystack.com/docs/payments/webhooks/#verify-event-origin
    const hash = createHmac('sha512', secretKey).update(JSON.stringify(req.body)).digest('hex');
    return hash === req.headers['x-paystack-signature'];
}