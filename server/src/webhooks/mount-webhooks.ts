import { Router, Express } from 'express';
import { AppServices, AppConfig } from '../core/index.js';
import { createPaystackWebhooks } from './paystack.js';
import { createCloudflareWebhooks } from './cloudflare.js';
import { createMuxWebhooks } from './mux.js';

export function mountWebHooks(server: Express, webhooksRoot: string, services: AppServices, config: AppConfig) {
    const router = Router();
    router.use('/paystack', createPaystackWebhooks(services, config.paystackSecretKey));
    router.use('/cloudflare', createCloudflareWebhooks(services));
    router.use('/mux', createMuxWebhooks(services));

    server.use(webhooksRoot, router);
}
