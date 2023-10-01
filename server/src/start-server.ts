import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { error404handler, errorHandler } from './api/middleware.js';
import { mountApi } from './api/index.js';
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
        mountApi(server, "/api", appServices);
        mountWebHooks(server, "/webhooks", appServices, config);
        server.use(errorHandler());
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
