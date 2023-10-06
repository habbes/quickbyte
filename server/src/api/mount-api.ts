import express, { Express, RequestHandler } from 'express';

import { AppServices } from '../core/index.js';
import { createRouter } from './router.js';
import { AppRequest } from './types.js';

export function mountApi(server: Express, apiRoot: string, services: AppServices) {
    server.use(apiRoot, createRouter());
}
