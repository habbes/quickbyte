import { Router, Express } from 'express';
import { AppServices, AppConfig } from '../core/index.js';
import { createPaystackWebhooks } from './paystack.js';

export function mountWebHooks(server: Express, webhooksRoot: string, services: AppServices, config: AppConfig) {
    const router = Router();
    router.use('/paystack', createPaystackWebhooks(services, config.paystackSecretKey));

    server.use(webhooksRoot, router);
    console.log('mounted webhooks', webhooksRoot);
}
