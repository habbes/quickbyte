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
    // S3
    s3AccessKeyId: string;
    s3SecretAccessKey: string;
    // Google auth:
    googleClientId: string;
    googleClientSecret: string;
    // Email
    emailProvider: 'mailjet'|'local';
    mailjetApiKey: string;
    mailjetApiSecret: string;
    mailjetSenderName: string;
    mailjetSenderEmail: string;
    systemEmailRecipient: string;
    // Sms
    smsProvider: 'at'|'local';
    atApiKey: string;
    atUsername: string;
    atSender: string;
    systemSmsRecipient: string;
    // Sentry
    enableSentry: boolean;
    sentryDsn: string;
    // Payment
    paymentProvider: 'paystack';
    paystackPublicKey: string;
    paystackSecretKey: string;
    paystackStarterMonthlyPlan: string;
    paystackStarterAnnualPlan: string;
    // web app base url
    webappBaseUrl: string;
    // used to authorize API for sending email announcement to users
    emailAnnouncementPassword: string;
    backgroundWorkerConcurrency: number;
    // cloudflare
    cloudflareAccountId: string;
    cloudflareStreamApiToken: string;
    cloudflareCustomerCode: string;
    // mux
    muxTokenId: string;
    muxTokenSecret: string;
    muxWebhookSecret: string;
    /**
     * The fully qualified URL where this server is running from
     */
    serverUrl: string;
}

export function getAppConfigFromEnv(env: NodeJS.ProcessEnv): AppConfig {
    return {
        dbUrl: env.DB_URL || "mongodb://localhost:27017/quickbyte",
        dbName: env.DB_NAME || "quickbyte",
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
        s3AccessKeyId: getRequiredEnv(env, 'S3_ACCESS_KEY_ID'),
        s3SecretAccessKey: getRequiredEnv(env, 'S3_SECRET_ACCESS_KEY'),
        mailjetApiKey: getRequiredEnv(env, 'MAILJET_API_KEY'),
        mailjetApiSecret: getRequiredEnv(env, 'MAILJET_API_SECRET'),
        mailjetSenderEmail: getRequiredEnv(env, 'MAILJET_SENDER_EMAIL'),
        mailjetSenderName: getRequiredEnv(env, 'MAILJET_SENDER_NAME'),
        emailProvider: env.EMAIL_PROVIDER === 'mailjet' ? 'mailjet' : 'local',
        systemEmailRecipient: getRequiredEnv(env, 'SYSTEM_EMAIL_RECIPIENT'),
        atUsername: getRequiredEnv(env, 'AT_USERNAME'),
        atApiKey: getRequiredEnv(env, 'AT_API_KEY'),
        atSender: getRequiredEnv(env, 'AT_SENDER'),
        systemSmsRecipient: getRequiredEnv(env, 'SYSTEM_SMS_RECIPIENT'),
        smsProvider: env.SMS_PROVIDER === 'at' ? 'at' : 'local',
        enableSentry: env.ENABLE_SENTRY === 'true',
        sentryDsn: env.ENABLE_SENTRY === 'true' ? getRequiredEnv(env, 'SENTRY_DSN') : '',
        paymentProvider: 'paystack',
        paystackPublicKey: getRequiredEnv(env, 'PAYSTACK_PUBLIC_KEY'),
        paystackSecretKey: getRequiredEnv(env, 'PAYSTACK_SECRET_KEY'),
        paystackStarterMonthlyPlan: getRequiredEnv(env, 'PAYSTACK_STARTER_MONTHLY_PLAN'),
        paystackStarterAnnualPlan: getRequiredEnv(env, 'PAYSTACK_STARTER_ANNUAL_PLAN'),
        webappBaseUrl: getRequiredEnv(env, 'WEBAPP_BASE_URL'),
        serverUrl: getRequiredEnv(env, 'SERVER_URL'),
        googleClientId: getRequiredEnv(env, 'GOOGLE_CLIENT_ID'),
        googleClientSecret: getRequiredEnv(env, 'GOOGLE_CLIENT_SECRET'),
        emailAnnouncementPassword: getRequiredEnv(env, "EMAIL_ANNOUNCEMENT_PASSWORD"),
        cloudflareAccountId: getRequiredEnv(env, 'CLOUDFLARE_ACCOUNT_ID'),
        cloudflareStreamApiToken: getRequiredEnv(env, 'CLOUDFLARE_STREAM_API_TOKEN'),
        cloudflareCustomerCode: getRequiredEnv(env, 'CLOUDFLARE_CUSTOMER_CODE'),
        muxTokenId: getRequiredEnv(env, 'MUX_TOKEN_ID'),
        muxTokenSecret: getRequiredEnv(env, 'MUX_TOKEN_SECRET'),
        muxWebhookSecret: getRequiredEnv(env, 'MUX_WEBHOOK_SECRET'),
        backgroundWorkerConcurrency: (env.BACKGROUND_WORKER_CONCURRENCY && Number(env.BACKGROUND_WORKER_CONCURRENCY)) || 5
    }
}

function getRequiredEnv(env: NodeJS.ProcessEnv, key: string): string {
    const value = env[key];
    if (value) {
        return value;
    }

    throw createAppError(`Required env variable not found: '${key}'`);
}

