import { MongoClient } from "mongodb";
import { AppConfig } from "./config.js";
import { createAppError } from "./error.js";
import {
AzureStorageHandler,
IStorageHandlerProvider,
StorageHandlerProvider,
AccountService,
IAuthService,
AuthService,
IAccountService,
ITransferDownloadService,
TransferDownloadService,
LocalEmailHandler,
MailjetEmailHandler,
PlanService,
EmailHandler,
AdminAlertsService,
IPlanService,
PaymentHandlerProvider,
PaystackPaymentHandler,
IUnauthenicatedTransactionService,
UnauthenticatedTransactionService,
IAlertService,
FreeTrialHandler,
LinkGenerator,
EventBus,
EmailAnnouncementService,
S3StorageHandler,
PlaybackPackagerRegistry,
CloudflarePlaybackPackager,
IPlaybackPackagerProvider,
MuxPlaybackPackager,
} from "./services/index.js";
import { SmsHandler } from "./services/sms/types.js";
import { LocalSmsHandler } from "./services/sms/local-sms-handler.js";
import { AtSmsHandler } from "./services/sms/at-sms-handler.js";
import { InviteService } from "./services/invite-service.js";
import { AccessHandler } from "./services/access-handler.js";
import { Database } from "./db.js";
import { GlobalEventHandler } from "./globale-event-handler.js";
import { BackgroundWorker } from "./background-worker.js";

export async function bootstrapApp(config: AppConfig): Promise<AppServices> {
    const dbConn = await getDbConnection(config);
    const db = new Database(dbConn.db, dbConn.client);
    await db.initialize();

    const backgroundWorker = new BackgroundWorker({
        concurrency: config.backgroundWorkerConcurrency
    });

    const storageProvider = new StorageHandlerProvider();

    // TODO: the s3 handler is not registered as intended
    // this configuration remains for backwards compatibility
    // but we should port to a more robust configuration
    // that supports different buckets in different regions
    const s3StorageHandler = new S3StorageHandler({
        availableRegions: ['eu-north-1'],
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
    });
    await s3StorageHandler.initialize();
    storageProvider.registerHandler(s3StorageHandler);

    const azureStorageHandler = new AzureStorageHandler({
        tenantId: config.azTenantId,
        clientId: config.azClientId,
        clientSecret: config.azClientSecret,
        resourcePrefix: config.azResourcePrefix,
        availableRegionCodes: config.azStorageRegionCodes,
        keyVaultUri: config.azKeyVaultUri,
        dataContainer: config.azDataContainer,
        pingContainer: config.azPingContainer,
        pingBlob: config.azPingBlob
    });

    await azureStorageHandler.initialize();
    storageProvider.registerHandler(azureStorageHandler);

    const links = new LinkGenerator({
        webappBaseUrl: config.webappBaseUrl
    });

    const emailHandler: EmailHandler = config.emailProvider === 'local'?
        new LocalEmailHandler() :
        new MailjetEmailHandler({
            apiKey: config.mailjetApiKey,
            apiSecret: config.mailjetApiSecret,
            sender: {
                email: config.mailjetSenderEmail,
                name: config.mailjetSenderName
            }
        });
    
    const smsHandler: SmsHandler = config.smsProvider === 'local' ?
        new LocalSmsHandler() :
        new AtSmsHandler({
            apiKey: config.atApiKey,
            username: config.atUsername,
            sender: config.atSender
        });
    
    const accessHandler = new AccessHandler(db);
    
    const adminAlerts = new AdminAlertsService({
        smsHandler: smsHandler,
        smsRecipient: config.systemSmsRecipient,
        emailHandler,
        emailRecipient: config.systemEmailRecipient
    });

    const eventBus = new EventBus({
        alerts: adminAlerts,
        workQueue: backgroundWorker
    });
    

    const playbacPackagerRegistry = new PlaybackPackagerRegistry();

    // playback packager should be registered in order of preference
    // because the first one to support a file will be selected
    const muxPlaybackPackager = new MuxPlaybackPackager({
        tokenId: config.muxTokenId,
        tokenSecret: config.muxTokenSecret,
        webhookSecret: config.muxWebhookSecret,
        storageHandlers: storageProvider,
        events: eventBus
    });
    playbacPackagerRegistry.registerHandler(muxPlaybackPackager);

    const cloudflarePackager = new CloudflarePlaybackPackager({
        accountId: config.cloudflareAccountId,
        apiToken: config.cloudflareStreamApiToken,
        customerCode: config.cloudflareCustomerCode,
        storageProviders: storageProvider,
        alerts: adminAlerts,
        webhookUrl: `${config.serverUrl}/webhooks/cloudflare/stream`,
        events: eventBus
    });
    await cloudflarePackager.initialize();
    playbacPackagerRegistry.registerHandler(cloudflarePackager);

    const plans = new PlanService({
        paystackPlanCodes: {
            starterMonthly: config.paystackStarterMonthlyPlan,
            starterAnnual: config.paystackStarterAnnualPlan
        }
    });

    const paystackHandler = new PaystackPaymentHandler({
        publicKey: config.paystackPublicKey,
        secretKey: config.paystackSecretKey,
    });

    const freeTrialHandler = new FreeTrialHandler();

    const paymentHandlers = new PaymentHandlerProvider();
    paymentHandlers.register(paystackHandler);
    paymentHandlers.register(freeTrialHandler);

    const invites = new InviteService(db, {
        emails: emailHandler,
        webappBaseUrl: config.webappBaseUrl
    });

    const accounts = new AccountService(db, {
        plans: plans,
        storageHandlers: storageProvider,
        paymentHandlers,
        emailHandler,
        webappBaseUrl: config.webappBaseUrl,
        invites,
        access: accessHandler,
        links,
        eventBus,
        playbackPackagers: playbacPackagerRegistry
    });

    const auth = new AuthService(db, {
        aadClientId: config.aadClientId,
        aadClientSecret: config.aadClientSecret,
        aadTenantId: config.aadTenantId,
        googleClientId: config.googleClientId,
        googleClientSecret: config.googleClientSecret,
        accounts,
        email: emailHandler,
        adminAlerts: adminAlerts,
        webappBaseUrl: config.webappBaseUrl,
        invites,
        access: accessHandler
    });

    const downloads = new TransferDownloadService(db, storageProvider);

    const transactions = new UnauthenticatedTransactionService(db.db, {
        paymentHandlers: paymentHandlers,
        plans: plans
    });

    const globalEventHandler = new GlobalEventHandler({
        email: emailHandler,
        db: db,
        links: links,
        backgroundWorker,
        playbackPackagers: playbacPackagerRegistry
    });
    globalEventHandler.registerEvents(eventBus);

    const emailAnnouncements = new EmailAnnouncementService(db, {
        email: emailHandler,
        password: config.emailAnnouncementPassword
    });

    return {
        storageProvider,
        playbackPackagerProvider: playbacPackagerRegistry,
        accounts,
        auth,
        downloads,
        plans,
        transactions,
        alerts: adminAlerts,
        emailAnnouncements
    };
}

export interface AppServices {
    storageProvider: IStorageHandlerProvider;
    playbackPackagerProvider: IPlaybackPackagerProvider;
    accounts: IAccountService;
    auth: IAuthService;
    downloads: ITransferDownloadService;
    plans: IPlanService;
    transactions: IUnauthenicatedTransactionService;
    alerts: IAlertService;
    emailAnnouncements: EmailAnnouncementService
}

async function getDbConnection(config: AppConfig) {
    try {
        const client = await MongoClient.connect(config.dbUrl)

        return {
            client,
            db: client.db(config.dbName),
        }
    } catch (e: any) {
        throw createAppError(`Database connection error: ${e.message}`, 'dbError');
    }
}