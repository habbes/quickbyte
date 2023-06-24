import { createAppError } from "./error.js";

export interface AppConfig {
    dbUrl: string;
    dbName: string;
    azureStorageContainer: string;
    azureStorageConnectionString: string;
    port: number;
}

export function getAppConfigFromEnv(env: NodeJS.ProcessEnv): AppConfig {
    return {
        dbUrl: env.DB_URL || "mongodb://localhost:27017/quickbyte",
        dbName: env.DB_NAME || "quickbyte",
        azureStorageContainer: getRequiredEnv(env, 'AZ_STORAGE_CONTAINER'),
        azureStorageConnectionString: getRequiredEnv(env, 'AZ_SA_NORTH_STORAGE_CONNECTION_STRING'),
        port: (env.port && Number(env.port)) || 3000
    }
}

function getRequiredEnv(env: NodeJS.ProcessEnv, key: string): string {
    const value = env[key];
    if (value) {
        return value;
    }

    throw createAppError(`Required env variable not found: '${key}'`);
}

