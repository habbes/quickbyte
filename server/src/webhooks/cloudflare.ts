import { Router } from 'express';
import { AppServices, CLOUDFLARE_STREAM_PACKAGER } from '../core/index.js';
import { wrapResponse } from '../api/middleware.js';

export function createCloudflareWebhooks(services: AppServices): Router {
    const routes = Router();

    const packager = services.playbackPackagerProvider.getPackager(CLOUDFLARE_STREAM_PACKAGER);

    routes.post('/', wrapResponse(async (req) =>
        packager.handleServiceEvent(req)));

    return routes;
}
