import { Router } from "express";
import { wrapResponse } from './middleware.js';

export const routes = Router();

routes.post('/accounts/:accountId/files', wrapResponse(req =>
    req.services.accounts.files(req.params.accountId).initFileUpload(req.body)));
