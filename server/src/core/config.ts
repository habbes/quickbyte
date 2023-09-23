import { createAppError } from "./error.js";

export interface AppConfig {
    /**
     * MongoDB URL (connection string)
     */
    dbUrl: string;
    /**
     * Database name
     */
    dbName: string;
    /**
     * Storage container for the legacy
     * storage account, before we
     * had multi-region support
     * @deprecated For backwards compatibility. Remove when preview version is over.
     */
    legacyAzStorageContainer: string;
    /**
     * Connection string for the legacy
     * storage account, before we
     * had multi-region support
     * @deprecated For backwards compatibility. Remove when preview version is over.
     */
    legacyAzStorageConnectionString: string;
    /**
     * @deprecated
     */
    legacyAzStoragePingContainer: string;
    /**
     * @deprecated
     */
    legacyAzStoragePingBlob: string;
    /**
     * Port that the server will listen on
     */
    port: number;
    /**
     * Client ID of the app registration that this
     * server uses to handle auth with Azure AD for customers
     */
    aadClientId: string;
    /**
     * Client secret of the app registration that this
     * server uses to handle auth with Azure AD for customers
     */
    aadClientSecret: string;
    /**
     * The Azure AD for Customers tenant that manages
     * the users of this service. Note that this
     * is different from the tenant used to
     * host storage accounts.
     */
    aadTenantId: string;
    /**
     * The Azure tenant that hosts the storage
     * accounts and other operational resources.
     */
    azTenantId: string;
    /**
     * The Client ID of the app registration that
     * the server uses to access key vaults,
     * storage accounts and other operational resources.
     */
    azClientId: string;
     /**
     * The Client secret of the app registration that
     * the server uses to access key vaults,
     * storage accounts and other operational resources.
     */
    azClientSecret: string;
    /**
     * The URL of the key vault that stores storage
     * account credentials
     */
    azKeyVaultUri: string;
    /**
     * Codes that represent the regions we support
     * for storage in Azure.
     */
    azStorageRegionCodes: string[];
    /**
     * The prefix that we use for names of the operational
     * resources in Azure.
     */
    azResourcePrefix: string;
    /**
     * The name of the container used to store user-uploaded
     * files in each storage account
     */
    azDataContainer: string;
    /**
     * The name of the container that stores the ping file
     * used to measure latency.
     */
    azPingContainer: string;
    /**
     * The name of the ping file
     */
    azPingBlob: string;
    // Email
    emailProvider: 'mailjet'|'local';
    mailjetApiKey: string;
    mailjetApiSecret: string;
    mailjetSenderName: string;
    mailjetSenderEmail: string;
}

export function getAppConfigFromEnv(env: NodeJS.ProcessEnv): AppConfig {
    return {
        dbUrl: env.DB_URL || "mongodb://localhost:27017/quickbyte",
        dbName: env.DB_NAME || "quickbyte",
        legacyAzStorageContainer: getRequiredEnv(env, 'AZ_STORAGE_CONTAINER'),
        legacyAzStorageConnectionString: getRequiredEnv(env, 'AZ_SA_NORTH_STORAGE_CONNECTION_STRING'),
        legacyAzStoragePingContainer: env.AZ_STORAGE_PING_CONTAINER || 'ping',
        legacyAzStoragePingBlob: env.AZ_STORAGE_PING_BLOB || 'ping.txt',
        port: (env.PORT && Number(env.PORT)) || 3000,
        aadClientId: getRequiredEnv(env, 'AAD_CLIENT_ID'),
        aadClientSecret: getRequiredEnv(env, 'AAD_CLIENT_SECRET'),
        aadTenantId: getRequiredEnv(env, 'AAD_TENANT_ID'),
        azTenantId: getRequiredEnv(env, 'AZ_TENANT_ID'),
        azClientId: getRequiredEnv(env, 'AZ_CLIENT_ID'),
        azClientSecret: getRequiredEnv(env, 'AZ_CLIENT_SECRET'),
        azKeyVaultUri: getRequiredEnv(env, 'AZ_KEY_VAULT_URI'),
        azStorageRegionCodes: getRequiredEnv(env, 'AZ_STORAGE_REGION_CODES').split(',').map(s => s.trim()),
        azResourcePrefix: getRequiredEnv(env, 'AZ_RESOURCE_PREFIX'),
        azDataContainer: env.AZ_DATA_CONTAINER || 'data',
        azPingContainer: env.AZ_PING_CONTAINER || 'ping',
        azPingBlob: env.AZ_PING_BLOB || 'ping.txt',
        mailjetApiKey: getRequiredEnv(env, 'MAILJET_API_KEY'),
        mailjetApiSecret: getRequiredEnv(env, 'MAILJET_API_SECRET'),
        mailjetSenderEmail: getRequiredEnv(env, 'MAILJET_SENDER_EMAIL'),
        mailjetSenderName: getRequiredEnv(env, 'MAILJET_SENDER_NAME'),
        emailProvider: env.EMAIL_PROVIDER === 'mailjet' ? 'mailjet' : 'local'
    }
}

function getRequiredEnv(env: NodeJS.ProcessEnv, key: string): string {
    const value = env[key];
    if (value) {
        return value;
    }

    throw createAppError(`Required env variable not found: '${key}'`);
}

