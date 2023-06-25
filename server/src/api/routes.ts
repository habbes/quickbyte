import { Router } from "express";
import { wrapResponse, requireAuth, requireAccountOwner } from './middleware.js';

export const routes = Router();

routes.post('/accounts/:accountId/files', requireAuth(), requireAccountOwner(), wrapResponse(req =>
    req.services.accounts.files(req.authContext).initFileUpload(req.body)));

routes.get('/accounts/:accountId/files',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.files(req.authContext).getAll()));

routes.post('/accounts/:accountId/files',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.files(req.authContext).getAll()));

routes.get('/accounts/:accountId/files/:fileId/download',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.files(req.authContext).requestDownload(req.params.fileId)));


routes.get('/me', requireAuth(), wrapResponse(req =>
    req.services.auth.getUserByToken(req.headers.authorization?.split(" ")[1] || "")));

routes.get('/downloads/:downladId', wrapResponse(req =>
    req.services.downloads.getById(req.params.downloadId)));

routes.get('/providers', wrapResponse(req =>
    Promise.resolve(req.services.storageProvider.getHandlerInfos())));


