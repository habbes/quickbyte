import express, { Router, Express } from 'express';
import { AppServices, AppConfig } from '../core/index.js';
import { createPaystackWebhooks } from './paystack.js';
import { createCloudflareWebhooks } from './cloudflare.js';
import { createMuxWebhooks } from './mux.js';

export function mountWebHooks(server: Express, webhooksRoot: string, services: AppServices, config: AppConfig) {
    const router = Router();
    // Use the text middleware to parse request bodies as plain text (instead of JSON)
    // This is because we want to preserve the original text so that we can correctly
    // validate webhook signatures
    router.use(express.text({ type: 'application/json' }));
    router.use('/paystack', createPaystackWebhooks(services, config.paystackSecretKey));
    router.use('/cloudflare', createCloudflareWebhooks(services));
    router.use('/mux', createMuxWebhooks(services));

    server.use(webhooksRoot, router);
}
