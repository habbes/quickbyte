import 'dotenv/config';
import { mountApi } from './api/mount-api.js';
import { bootstrapApp, getAppConfigFromEnv } from './core/index.js';
import { createServer } from './server/index.js';


async function startServer() {
    try {
        const config = getAppConfigFromEnv(process.env);

        const server = createServer(config);

        const appServices = await bootstrapApp(config);
        
        
        mountApi(server, "/api", appServices);

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
