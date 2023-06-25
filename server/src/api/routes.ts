import { Router } from "express";
import { wrapResponse, requireAuth, requireAccountOwner } from './middleware.js';

export const routes = Router();

routes.post('/accounts/:accountId', requireAuth(), requireAccountOwner(), wrapResponse(req =>
    req.services.accounts.files(req.params.accountId).initFileUpload(req.body)));

routes.get('/me', requireAuth(), wrapResponse(req =>
    req.services.auth.getUserByToken(req.headers.authorization?.split(" ")[1] || "")));

