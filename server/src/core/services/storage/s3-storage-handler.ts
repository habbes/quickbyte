import { S3Client, GetObjectCommand, PutObjectCommand, PutBucketCorsCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { IStorageHandler, StorageRegionInfo } from "./types.js";
import { createAppError, createInvalidAppStateError, createResourceNotFoundError } from "../../error.js";
import { executeTasksInBatches } from "@quickbyte/common";


export class S3StorageHandler implements IStorageHandler {
    private regions: Record<string, RegionConfig> = {}
    private initialized = false;

    constructor(private config: S3StorageHandlerConfig) {
    }

    async initialize() {
        const tasks = this.config.availableRegions.map(r => this.generateConfigForRegion(r));
        await Promise.all(tasks);
        this.initialized = true;
    }

    private ensureInitialized() {
        if (!this.initialized) {
            throw createInvalidAppStateError(`Storage handler s3 has not been initiazed. Make sure to call handler.initialize() during app startup.`);
        }
    }

    private async generateConfigForRegion(region: string) {
        // creds
        const client = new S3Client({
            region,
            credentials: {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey
            }
        });

       
        const bucket = 'testquickbyteeunorth1';
        var corsConfig = new PutBucketCorsCommand({
            Bucket: bucket,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedMethods: ["GET", "PUT", "HEAD"],
                        AllowedOrigins: ["*"],
                        AllowedHeaders: ["*"]
                    },
                ]
            }
        });
        await client.send(corsConfig);

        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: 'ping.txt',
        });

        // TODO: S3 requires presigned URLs to expire in less than week,
        // So we should generate a url for the ping blob for each request
        // instead of once
        const fiveDays = 5 * 24 * 60 * 60;
        const pingUrl = await getSignedUrl(client, command, { expiresIn: fiveDays });

        this.regions[region] = {
            region,
            client,
            pingUrl,
            bucket
        };
    }

    name(): string {
        return "s3";
    }

    getAvailableRegions(): StorageRegionInfo[] {
        this.ensureInitialized();

        const regions = Object.values(this.regions).map(r => ({
            id: r.region,
            name: r.region,
            pingUrl: r.pingUrl
        }));

        return regions;
    }

    async getBlobUploadUrl(region: string, account: string, blobName: string, expiryDate: Date): Promise<string> {
        this.ensureInitialized();

        if (!(region in this.regions)) {
            throw createResourceNotFoundError(`Unknown region '${region}' for the specified provider '${this.name()}'`);
        }

        const expiresInSeconds = Math.floor((Date.now() - expiryDate.getTime()) / 1000);
        const { client, bucket } = this.regions[region];
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: `data/${account}/${blobName}`,
        });

        const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
        return url;
    }

    async getBlobDownloadUrl(region: string, account: string, blobName: string, expiryDate: Date, originalName: string): Promise<string> {
        this.ensureInitialized();

        if (!(region in this.regions)) {
            throw createResourceNotFoundError(`Unknown region '${region}' for the specified provider '${this.name()}'`);
        }

        const defaultDownloadName = normalizeFileNameForSasUrl(originalName);
        const expiresInSeconds = Math.floor((expiryDate.getTime() - Date.now()) / 1000);
        const { client, bucket } = this.regions[region];
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: `data/${account}/${blobName}`,
            ResponseContentDisposition: `attachment; filename="${defaultDownloadName}"`
        });

        const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
        return url;
    }

    async initMultitpartUpload(region: string, account: string, blobName: string, size: number, blockSize: number) {
        this.ensureInitialized();

        if (!(region in this.regions)) {
            throw createResourceNotFoundError(`Unknown region '${region}' for the specified provider '${this.name()}'`);
        }

        const { client, bucket } = this.regions[region];
        const multipartUpload = await client.send(new CreateMultipartUploadCommand({
            Bucket: bucket,
            Key: `data/${account}/${blobName}`
        }));

        // generate parts
        let remainingSize = size;
        const blockNumbers = [];
        let index = 1;
        while (remainingSize > 0) {
            const block = {
                number: index,
                size: Math.min(remainingSize, blockSize)
            };

            remainingSize -= block.size;
            blockNumbers.push(block);
            index++;
        }

        const fiveDays = 5 * 24 * 60 * 60;

        const presignedBlocks = await executeTasksInBatches(
            blockNumbers,
            async block => {
                const url = await getSignedUrl(client, new UploadPartCommand({
                    UploadId: multipartUpload.UploadId,
                    Bucket: bucket,
                    Key: `data/${account}/${blobName}`,
                    PartNumber: block.number,
                }), {
                    expiresIn: fiveDays
                });

                return {
                    index: block.number,
                    size: block.size,
                    url
                }
            },
            10
        );

        return {
            uploadId: multipartUpload.UploadId,
            blockSize,
            size,
            blocks: presignedBlocks
        };
    }

    async completeMultiPartUpload(region: string, account: string, blobName: string, uploadId: string, blocks: { index: number, etag: string }[]) {
        this.ensureInitialized();

        if (!(region in this.regions)) {
            throw createResourceNotFoundError(`Unknown region '${region}' for the specified provider '${this.name()}'`);
        }

        const { client, bucket } = this.regions[region];

        const result = await client.send(new CompleteMultipartUploadCommand({
            UploadId: uploadId,
            Bucket: bucket,
            Key: `data/${account}/${blobName}`,
            MultipartUpload: {
                Parts: blocks.map(b => ({
                    PartNumber: b.index,
                    ETag: b.etag
                }))
            }
        }));

        return {
            etag: result.ETag
        };
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

export interface S3StorageHandlerConfig {
    availableRegions: string[];
    accessKeyId: string;
    secretAccessKey: string;
}

interface RegionConfig {
    region: string;
    client: S3Client;
    pingUrl: string;
    bucket: string;
}
