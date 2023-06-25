import { Router } from "express";
import { wrapResponse } from './middleware.js';

export const routes = Router();

routes.post('/accounts/:accountId/files', wrapResponse(req =>
    req.services.accounts.files(req.params.accountId).initFileUpload(req.body)));

routes.get('/me', wrapResponse(req =>
    req.services.auth.getUserByToken(req.headers.authorization?.split(" ")[1] || "")));

routes.get('/verify', wrapResponse(req =>
    req.services.auth.verifyToken(req.headers.authorization?.split(" ")[1] || "").then(() => ({ ok: true }))));
