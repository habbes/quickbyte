import { Router } from 'express';
import { AppServices, MUX_PLAYBACK_PACKAGER_NAME } from '../core/index.js';
import { wrapResponse } from '../api/middleware.js';

export function createMuxWebhooks(services: AppServices): Router {
    const routes = Router();

    const packager = services.playbackPackagerProvider.getPackager(MUX_PLAYBACK_PACKAGER_NAME);

    routes.post('/', wrapResponse(async (req) =>
        packager.handleServiceEvent(req)));

    return routes;
}
