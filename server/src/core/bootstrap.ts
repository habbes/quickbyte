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
UnauthenticatedTransactionService
} from "./services/index.js";
import { IPreviewUserService, PreviewUsersService } from "./services/preview-users-service.js";
import { SmsHandler } from "./services/sms/types.js";
import { LocalSmsHandler } from "./services/sms/local-sms-handler.js";
import { AtSmsHandler } from "./services/sms/at-sms-handler.js";

export async function bootstrapApp(config: AppConfig): Promise<AppServices> {
    const db = await getDbConnection(config);

    const azureStorageHandler = new AzureStorageHandler({
        tenantId: config.azTenantId,
        clientId: config.azClientId,
        clientSecret: config.azClientSecret,
        resourcePrefix: config.azResourcePrefix,
        availableRegionCodes: config.azStorageRegionCodes,
        legacyAccountConnectionString: config.legacyAzStorageConnectionString,
        legacyAccountContainer: config.legacyAzStorageContainer,
        legacyPingContainer: config.legacyAzStoragePingContainer,
        legacyPingBlob: config.legacyAzStoragePingBlob,
        keyVaultUri: config.azKeyVaultUri,
        dataContainer: config.azDataContainer,
        pingContainer: config.azPingContainer,
        pingBlob: config.azPingBlob
    });

    await azureStorageHandler.initialize();

    const storageProvider = new StorageHandlerProvider();
    storageProvider.registerHandler(azureStorageHandler);

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
        })
    
    const plans = new PlanService({
        paystackPlanCodes: {
            starterMonthly: config.paystackStarterMonthlyPlan
        }
    });

    const paystackHandler = new PaystackPaymentHandler({
        publicKey: config.paystackPublicKey,
        secretKey: config.paystackSecretKey,
    });

    const paymentHandlers = new PaymentHandlerProvider();
    paymentHandlers.register(paystackHandler);

    const accounts = new AccountService(db, {
        plans: plans,
        storageHandlers: storageProvider,
        paymentHandlers
    });

    const auth = new AuthService(db, {
        aadClientId: config.aadClientId,
        aadClientSecret: config.aadClientSecret,
        aadTenantId: config.aadTenantId,
        accounts
    });

    const downloads = new TransferDownloadService(db, storageProvider);
    const adminAlerts = new AdminAlertsService({
        smsHandler: smsHandler,
        smsRecipient: config.systemSmsRecipient
    });

    const previewUsers = new PreviewUsersService(db, {
        emailHandler,
        alerts: adminAlerts
    });

    const transactions = new UnauthenticatedTransactionService(db, {
        paymentHandlers: paymentHandlers,
        plans: plans
    });

    return {
        storageProvider,
        accounts,
        auth,
        downloads,
        previewUsers,
        plans,
        transactions
    };
}

export interface AppServices {
    storageProvider: IStorageHandlerProvider;
    accounts: IAccountService;
    auth: IAuthService;
    downloads: ITransferDownloadService;
    previewUsers: IPreviewUserService;
    plans: IPlanService;
    transactions: IUnauthenicatedTransactionService;
}

async function getDbConnection(config: AppConfig) {
    try {
        const client = await MongoClient.connect(config.dbUrl);
        return client.db(config.dbName);
    } catch (e: any) {
        throw createAppError(`Database connection error: ${e.message}`, 'dbError');
    }
}