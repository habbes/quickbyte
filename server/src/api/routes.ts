import { Router } from "express";
import { wrapResponse, requireAuth, requireAccountOwner } from './middleware.js';

export const routes = Router();

routes.post('/accounts/:accountId/transfers',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.transfers(req.authContext).create(req.body), 201));

routes.post('/accounts/:accountId/transfers/:transferId/finalize',
    requireAuth(),
    wrapResponse(req =>
        req.services.accounts.transfers(req.authContext).finalize(req.params.transferId, req.body)));

routes.get('/accounts/:accountId/transfers/:transferId',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.transfers(req.authContext).getById(req.params.transferId)));

routes.post('/accounts/:accountId/subscriptions',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.transactions(req.authContext).initiateSubscription(req.body)));

routes.get('/accounts/:accountId/transactions/:transactionId',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.transactions(req.authContext).verifyTransaction(req.params.transactionId)));

routes.post('/accounts/:accountId/transactions/:transactionId/cancel',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.transactions(req.authContext).cancelTransaction(req.params.transactionId)));

routes.post('/accounts/:accountId/subscriptions/:subscriptionId/manage',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.transactions(req.authContext)
        .getSubscriptionManagementUrl(req.params.subscriptionId)));

routes.get('/accounts/:accountId/transfers',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.transfers(req.authContext).get()));


routes.get('/accounts/:accountId/projects',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.projects(req.authContext).getByAccount(req.params.accountId)));

routes.get('/accounts/:accountId/projects/:projectId',
    requireAuth(),
    wrapResponse(req =>
        req.services.accounts.projects(req.authContext).getById(req.params.projectId)));

routes.post('/accounts/:accountId/projects',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.projects(req.authContext).createProject(req.body)));

routes.post('/accounts/:accountId/projects/:projectId/upload',
    requireAuth(),
    wrapResponse(req =>
        req.services.accounts.projects(req.authContext).uploadMedia(req.params.projectId, req.body)));

routes.get('/accounts/:accountId/projects/:projectId/media',
    requireAuth(),
    wrapResponse(req =>
        req.services.accounts.projects(req.authContext).getMedia(req.params.projectId)));

routes.get('/accounts/:accountId/projects/:projectId/media/:mediaId',
    requireAuth(),
    wrapResponse(req =>
        req.services.accounts.projects(req.authContext).getMediumById(req.params.projectId, req.params.mediaId)));

routes.post('/accounts/:accountId/projects/:projectId/media/:mediaId/comments',
    requireAuth(),
    wrapResponse(req =>
        req.services.accounts.projects(req.authContext)
            .createMediaComment(req.params.projectId, req.params.mediaId, req.body)));

routes.post('/accounts/:accountId/projects/:projectId/invite',
    requireAuth(),
    requireAccountOwner(),
    wrapResponse(req =>
        req.services.accounts.projects(req.authContext)
            .inviteUsers(req.params.projectId, req.body)));

routes.get('/me', requireAuth(), wrapResponse(req =>
    Promise.resolve(req.authContext.user)));

routes.post('/downloads/:transferId', wrapResponse(req =>
    req.services.downloads.requestDownload(req.params.transferId, req.body)));

routes.patch('/downloads/:transferId/requests/:requestId', wrapResponse(req =>
    req.services.downloads.updateDownloadRequest(req.params.transferId, req.params.requestId, req.body)));

routes.get('/providers', wrapResponse(req =>
    Promise.resolve(req.services.storageProvider.getHandlerInfos())));
