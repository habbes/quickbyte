import { SecretClient } from "@azure/keyvault-secrets";
import { ClientSecretCredential } from "@azure/identity"
import { BlobSASPermissions, BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { IStorageHandler, StorageRegionInfo } from "./types.js";
import { createAppError, createResourceNotFoundError, rethrowIfAppError } from "../../error.js";

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
            await Promise.all(tasks);
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
            // TODO: this error occurred during testing, it should ideally never occur, please investigate
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

        // TODO: it would be great to default to the original name, but
        // azure will reject requests with "invalid characters" in the name.
        // For now we use the blobName (which is likely randomly generated) for the default download name.
        // But we should ideally normalize/sanitize the original name and use that instead.
        const defaultDownloadName = normalizeFileNameForSasUrl(originalName);

        try {
            const container = this.regionAccounts[region].container;
            const blobPath = `${account}/${blobName}`;
            const blob = container.getBlobClient(blobPath);
            // TODO: should we verify that blob exists?
            const url = await blob.generateSasUrl({
                permissions: BlobSASPermissions.from({ read: true }),
                expiresOn: expiryDate,
                contentDisposition: `attachment; filename="${defaultDownloadName}"`
            });

            return url;
        }
        catch (e: any) {
            rethrowIfAppError(e);
            throw createAppError(e);
        }
    }

    initBlobUpload(region: string, account: string, blobName: string, size: number, blockSize: number): Promise<unknown> {
        return Promise.resolve();
    }

    completeBlobUpload(region: string, account: string, blobName: string, providerArgs: unknown): Promise<unknown> {
        return Promise.resolve();
    }
}

/**
 * Removes characters not supported in Azure SAS URLs
 * @param name
 */
function normalizeFileNameForSasUrl(name: string): string {
    const chars = new Array(name.length);
    for (let i = 0; i < name.length; i++) {
        if (name.charCodeAt(i) >= 127) {
            chars[i] = '_';
        } else {
            chars[i] = name.charAt(i);
        }
    }

    return chars.join('');
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
}

interface AzureStorageAccount {
    regionCode: string;
    client: BlobServiceClient,
    container: ContainerClient,
    pingContainer: ContainerClient,
    pingBlobName: string;
    pingUrl: string;
}
