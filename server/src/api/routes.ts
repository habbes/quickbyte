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

routes.get('/accounts/:accountId/files/:fileId',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.files(req.authContext).getById(req.params.fileId)));

routes.get('/accounts/:accountId/files/:fileId/download',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.files(req.authContext).requestDownload(req.params.fileId)));

routes.post('/accounts/:accountId/transfers',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.transfers(req.authContext).create(req.body), 201));

routes.post('/accounts/:accountId/transfers/:transferId/finalize',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.transfers(req.authContext).finalize(req.params.transferId)));


routes.get('/me', requireAuth(), wrapResponse(req =>
    req.services.auth.getUserByToken(req.headers.authorization?.split(" ")[1] || "")));

routes.get('/downloads/:downloadId', wrapResponse(req =>
    req.services.downloads.getById(req.params.downloadId)));

routes.get('/providers', wrapResponse(req =>
    Promise.resolve(req.services.storageProvider.getHandlerInfos())));


