import { Express } from 'express';

import { AppServices } from '../core/index.js';
import { createRouter } from './router.js';

export function mountApi(server: Express, apiRoot: string, services: AppServices) {
    server.use(apiRoot, createRouter());
}
