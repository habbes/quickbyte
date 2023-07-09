import { SecretClient } from "@azure/keyvault-secrets";
import { ClientSecretCredential } from "@azure/identity"
import { BlobSASPermissions, BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { IStorageHandler, StorageRegionInfo } from "./types.js";
import { createAppError, createResourceNotFoundError, rethrowIfAppError } from "../../error.js";

// For backwards compatibility. Should be removed in the next major version
/**
 * The region code of the storage account we used
 * before we had support for multiple regions that
 * were provisioned by our infrastructure tooling.
 * @deprecated This used for backwards compatibility. It should be removed when the preview version is over.
 */
const LEGACY_REGION = 'sa-north';

export class AzureStorageHandler implements IStorageHandler {
    private regionAccounts: Record<string, AzureStorageAccount> = {};
    private keyVault: SecretClient;
    private initialized: boolean = false;

    constructor(private config: AzureStorageHandlerConfig) {
        this.keyVault = new SecretClient(
            this.config.keyVaultUri,
            new ClientSecretCredential(this.config.tenantId, this.config.clientId, this.config.clientSecret));
    }

    public async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            const tasks = this.config.availableRegionCodes.map(regionCode => this.getConfigForRegion(regionCode));
            await tasks;
            this.initialized = true;
        } catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    private ensureInitialized() {
        if (!this.initialized) {
            throw createAppError("Storage handler 'az' has not been initiazed. Make sure to call handler.initialize() during app startup.");
        }
    }

    private async getConfigForRegion(regionCode: string): Promise<AzureStorageAccount> {
        if (regionCode in this.regionAccounts) {
            return this.regionAccounts[regionCode];
        }

        if (regionCode === LEGACY_REGION) {
            return this.getLegacyConfig();
        }

        const connectionStringKey = `${this.config.resourcePrefix}${regionCode}-connection-string`;
        const secret = await this.keyVault.getSecret(connectionStringKey);
        const connectionString = secret.value;
        if (!connectionString) {
            throw createAppError(
                `Unable to read Azure Storage Account connection string for region '${regionCode}' using key '${connectionStringKey}'.`
                + ' Check the infrastructure guide and ensure you have properly configure and privisioned this region.');
        }

        const client = BlobServiceClient.fromConnectionString(connectionString);
        const container = client.getContainerClient(this.config.dataContainer);
        const pingContainer = client.getContainerClient(this.config.pingContainer);
        const pingBlobName = this.config.pingBlob;
        const pingBlob = pingContainer.getBlobClient(pingBlobName);

        const oneYear = 1 * 365 * 24 * 60 * 60 * 1000;
        const expiryDate = new Date(oneYear + Date.now());
        const pingUrl = await pingBlob.generateSasUrl({
            permissions: BlobSASPermissions.from({ read: true }),
            expiresOn: expiryDate,
        });

        this.regionAccounts[regionCode] = {
            regionCode,
            client,
            container,
            pingContainer,
            pingBlobName,
            pingUrl
        };

        return this.regionAccounts[regionCode];
    }

    private async getLegacyConfig(): Promise<AzureStorageAccount> {
        if (LEGACY_REGION in this.regionAccounts) {
            return this.regionAccounts[LEGACY_REGION];
        }

        const connetionString = this.config.legacyAccountConnectionString;
        const containerName = this.config.legacyAccountContainer;
        const client = BlobServiceClient.fromConnectionString(connetionString);
        const container = client.getContainerClient(containerName);
        const pingContainer = client.getContainerClient(this.config.legacyPingContainer);
        const pingBlobName = this.config.legacyPingBlob;
        const pingBlob = pingContainer.getBlobClient(pingBlobName);

        const oneYear = 1 * 365 * 24 * 60 * 60 * 1000;
        const expiryDate = new Date(oneYear + Date.now());
        const pingUrl = await pingBlob.generateSasUrl({
            permissions: BlobSASPermissions.from({ read: true }),
            expiresOn: expiryDate,
        });

        this.regionAccounts[LEGACY_REGION] = {
            regionCode: LEGACY_REGION,
            client,
            container,
            pingContainer,
            pingBlobName,
            pingUrl
        }

        return Promise.resolve(this.regionAccounts[LEGACY_REGION]);
    }

    name(): string {
        return 'az';
    }

    getAvailableRegions(): StorageRegionInfo[] {
        this.ensureInitialized();

        return Object.keys(this.regionAccounts).map(region => {
            return {
                id: region,
                name: region,
                pingUrl: this.regionAccounts[region].pingUrl
            }
        });
    }

    async getBlobUploadUrl(region: string, account: string, blobName: string, expiryDate: Date): Promise<string> {
        this.ensureInitialized();

        if (!(region in this.regionAccounts)) {
            throw createResourceNotFoundError(`Unknown region '${region}' for the specified provider '${this.name()}'`);
        }
        
        try {
            const container = this.regionAccounts[region].container;
            const blobPath = `${account}/${blobName}`;
            const blob = container.getBlobClient(blobPath);
            const url = await blob.generateSasUrl({
                permissions: BlobSASPermissions.from({ write: true, create: true }),
                expiresOn: expiryDate
            });

            return url;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    async getBlobDownloadUrl(region: string, account: string, blobName: string, expiryDate: Date, originalName: string): Promise<string> {
        this.ensureInitialized();
    
        if (!(region in this.regionAccounts)) {
            throw createResourceNotFoundError(`Unknown region '${region}' for the specified provider '${this.name()}'`);
        }

        try {
            const container = this.regionAccounts[region].container;
            const blobPath = `${account}/${blobName}`;
            const blob = container.getBlobClient(blobPath);
            // TODO: should we verify that blob exists?
            const url = await blob.generateSasUrl({
                permissions: BlobSASPermissions.from({ read: true }),
                expiresOn: expiryDate,
                contentDisposition: `attachment; filename="${originalName}"`
            });

            return url;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }
}

export interface AzureStorageHandlerConfig {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    keyVaultUri: string;
    availableRegionCodes: string[];
    resourcePrefix: string;
    dataContainer: string;
    pingContainer: string;
    pingBlob: string;
    /**
     * The connection string of the storage account
     * that was used before we had support for multiple
     * regions that were provisioned by our infrastracture
     * tooling.
     * @deprecated For backwards compatibility. This field should
     * be removed when we launch publicly.
     */
    legacyAccountConnectionString: string;
    /**
     * The data container of the storage account
     * that was used before we had support for multiple
     * regions that were provisioned by our infrastracture
     * tooling.
     * @deprecated For backwards compatibility. This field should
     * be removed when we launch publicly.
     */
    legacyAccountContainer: string;
    /**
     * @deprecated
     */
    legacyPingContainer: string;
    /**
     * @deprecated
     */
    legacyPingBlob: string;
}

interface AzureStorageAccount {
    regionCode: string;
    client: BlobServiceClient,
    container: ContainerClient,
    pingContainer: ContainerClient,
    pingBlobName: string;
    pingUrl: string;
}
