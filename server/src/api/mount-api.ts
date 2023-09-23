import express, { Express, RequestHandler } from 'express';
import cors from 'cors';
import { AppServices } from '../core/index.js';
import { createRouter } from './router.js';
import { AppRequest } from './types.js';
import { error404handler, errorHandler } from './middleware.js';

export function mountApi(server: Express, apiRoot: string, services: AppServices) {
    server.use(express.json());
    server.use(cors());

    server.use(injectServices(services));

    server.use(apiRoot, createRouter());

    server.use(errorHandler());
    server.use(error404handler('Resource does not exist or you do not have sufficient permissions.'));
}

function injectServices(services: AppServices): RequestHandler {
    // TODO: This causes an issue cause AppRequest contains
    // extra properties not in Request
    // @ts-ignore
    return (req: AppRequest, res, next) => {
        req.services = services;
        next();
    }
}