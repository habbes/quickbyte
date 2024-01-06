import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { error404handler, errorHandler, injectServices } from './api/middleware.js';
import { mountApi, } from './api/index.js';
import { mountTrpc } from './trpc/index.js';
import { mountWebHooks } from './webhooks/index.js';
import { bootstrapApp, getAppConfigFromEnv } from './core/index.js';
import { createServer } from './server/index.js';


async function startServer() {
    try {
        const config = getAppConfigFromEnv(process.env);

        const server = createServer(config);

        const appServices = await bootstrapApp(config);
        
        server.use(express.json());
        server.use(cors());
        server.use(injectServices(appServices));
        mountApi(server, "/api", appServices);
        mountTrpc(server, "/trpc", appServices);
        mountWebHooks(server, "/webhooks", appServices, config);
        server.use(errorHandler(appServices.alerts));
        server.use(error404handler('Resource does not exist or you do not have sufficient permissions.'));

        server.listen(config.port, () => {
            console.log(`server listening on port ${config.port}`);
        });
    }
    catch (e) {
        console.error(`Failed to start server`, e);
        process.exit(1);
    }
}

startServer();
