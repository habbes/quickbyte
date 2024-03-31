import { Axios } from 'axios';
import { PlaybackPackagingStatus, PlaybackPackagingResult, getFileName, TransferFile, getFileExtension, getMediaType, PlaybackUrls } from "@quickbyte/common";
import { PackagingEventHandlingResult, PlaybackPackager } from "./types.js";
import { StorageHandlerProvider, getDownloadUrl } from "../storage/index.js";
import { createAppError, createInvalidAppStateError } from '../../error.js';
import { IAlertService } from "../admin-alerts-service.js";
import { createHmac } from "node:crypto";
import { Request } from "express";
import { EventDispatcher } from '../event-bus/event-bus.js';

interface CloudflareConfig {
    accountId: string;
    apiToken: string;
    customerCode: string;
    storageProviders: StorageHandlerProvider;
    webhookUrl: string;
    alerts: IAlertService;
    events: EventDispatcher;
}

export const CLOUDFLARE_STREAM_PACKAGER = 'cloudflareStream';

// see: https://developers.cloudflare.com/stream/get-started/

export class CloudflarePlaybackPackager implements PlaybackPackager {
    private client: Axios;
    private webhookSecret?: string;
    private customerSubdomain: string;

    name() {
        return CLOUDFLARE_STREAM_PACKAGER;
    }

    constructor(private config: CloudflareConfig) {
        this.client = new Axios({
            baseURL: `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/`,
            headers: {
                Authorization: `Bearer ${config.apiToken}`,
                "Content-Type": "application/json",
            }
        });

        this.customerSubdomain = `customer-${this.config.customerCode}.cloudflarestream.com`;
    }

    async initialize() {
        // Cloudflare does not seem provide a means to create webhooks in the dashboard
        // Further, it only allows creating one webhook per account.
        // Since I may share accounts between dev, preview and staging (to save costs), it's easier
        // to register a webhook dynamically. But that also means only one
        // environment can receive webhooks at a time
        // see: https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/
        const response = await this.client.put<CreateWebhookResult>('stream/webhook', {
            notificationUrl: this.config.webhookUrl
        });

        const webhook = response.data;
        if (!webhook.success) {
            throw createAppError(`Failed to register Cloudflare webhook: ${JSON.stringify(webhook)}`);
        }

        this.webhookSecret = webhook.result.secret;
    }

    canPackage(file: TransferFile): boolean {
        const mediaType = getMediaType(file.name);
        return mediaType === 'video';
    }

    async startPackagingFile(file: TransferFile): Promise<PlaybackPackagingResult> {
        console.log(`Cloudflare creating encoding job for file '${file._id}`);
        const storageHandler = this.config.storageProviders.getHandler(file.provider);
        const INTERVAL = 2 * 24 * 60 * 60 * 1000; // 2 days
        const expiresAt = new Date(Date.now() + INTERVAL);
        const downloadUrl = getDownloadUrl(storageHandler, file, expiresAt);
        // see: https://developers.cloudflare.com/api/operations/stream-videos-upload-videos-from-a-url
        const response = await this.client.post<CloudflareStreamUploadResult>(
            'stream/copy',
            {
                url: downloadUrl,
                meta: {
                    name: getFileName(file),
                    quickbyteId: file._id,
                }
            }
        );

        const cloudflareResult = response.data;
        const result = convertToQuickbyteResult(cloudflareResult);
        return result;
    }

    async getPackagingInfo(file: TransferFile): Promise<PlaybackPackagingResult> {
        const response = await this.client.get<CloudflareStreamUploadResult>(`stream/${file.playbackPackagingId}`);
        const data = response.data;

        const result = convertToQuickbyteResult(data);

        return result;
    }

    async getPlaybackUrls(file: TransferFile): Promise<PlaybackUrls> {
        if (file.playbackPackagingProvider === this.name()) {
            throw createInvalidAppStateError(`File ${file._id} was not packaged with cloudflare. Current packager is: '${file.playbackPackagingProvider}'`);
        }

        if (!file.playbackPackagingId) {
            throw createInvalidAppStateError(`File ${file._id} does not have a packaging id.`);
        }

        // see: https://developers.cloudflare.com/stream/viewing-videos/using-own-player/#fetch-hls-and-dash-manifests

        return {
            hlsManifestUrl: `${this.customerSubdomain}/${file.playbackPackagingId}/manifest/video.m3u8`,
            dashManifestUrl: `${this.customerSubdomain}/${file.playbackPackagingId}/manifest/video.mpd`,
            thumbnailUrl: `${this.customerSubdomain}/${file.playbackPackagingId}/thumbnails/thumbnail.jpg`
        }
    }

    async handleServiceEvent(request: Request): Promise<PackagingEventHandlingResult> {
        console.log('Processing Cloudflare webhook...');
        if (!this.isWebhookValid(request)) {
            const body = request.body;
            await this.config.alerts.sendNotification(
                'Cloudflare webhook triggered with invalid signature.',
                `<p>Cloudflare webhook triggered with invalid signature</p><p>${JSON.stringify(body)}</p>`
            );
    
            return {
                handled: false
            }
        }
        
        const body = request.body as WebhookPayload;
        if (body.uid) {
            // We should update the file record or notify the file to be updated
            this.config.events.send({
                type: 'filePlaybackPackagingUpdated',
                data: {
                    packager: this.name(),
                    packagerId: body.uid
                }
            });

            return {
                handled: true,
                providerId: body.uid
            }
        }

        return {
            handled: true
        };
    }

    private isWebhookValid(request: Request): boolean {
        if (!this.webhookSecret) {
            throw createInvalidAppStateError('Cloudflare webhook secret not initialized during validation. Please call intialize() method during startup.');
        }
        // https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/#verify-webhook-authenticity
        const signatureHeader = request.headers['Webhook-signature'] as string;
        if (!signatureHeader) {
            console.error('Cloudflare webhook does not contain signature');
            return false;
        }

        const [timePart, sigPart] = signatureHeader.split(',');
        if (!timePart) {
            console.error('Cloudflare webhook signature does not contain timestamp');
            return false;
        }

        const [timeKey, time] = timePart.split('=');
        if (timeKey !== 'time' || !time) {
            console.error('Cloudflare webhook signature contains malformed timestamp');
            return false;
        }

        if (!sigPart) {
            console.error('Cloudflare webhook signature header does not container signature');
            return false;
        }
        const [sigKey, signature] = sigPart.split('=');
        if (sigKey !== 'sig1' || !signature) {
            console.error('Cloudflare signature header contains malformed signature');
            return false;
        }

        const body = JSON.stringify(request.body);
        const payload = `${time}.${body}`;
        const hash = createHmac('sha256', this.webhookSecret).update(payload).digest('hex');
        if (hash !== signature) {
            console.error('Cloudflare webhook signature is invalid.');
            return false;
        }

        return true;
    }
}

function convertToQuickbyteResult(data: CloudflareStreamUploadResult): PlaybackPackagingResult {
    const result: PlaybackPackagingResult = {
        providerId: data.result.uid,
        status: convertToQuickbyteStatus(data.result.status.state),
        metatada: data
    };

    if (data.result.status.errorReasonText) {
        result.error = data.result.status.errorReasonText;
    }

    if (data.result.status.errorReasonCode) {
        result.errorReason = data.result.status.errorReasonCode === 'ERR_NON_VIDEO' ? 'notMedia' : 'serviceError';
    }

    return result;
}

function convertToQuickbyteStatus(sourceStatus: EncodingState): PlaybackPackagingStatus {
    if (sourceStatus === 'error') {
        return 'error'
    }
    else if (sourceStatus === 'ready') {
        return 'success';
    } else {
        return 'progress';
    }
}

// see: https://developers.cloudflare.com/api/operations/stream-videos-upload-videos-from-a-url
interface CloudflareStreamUploadResult {
    result:   ClouldflareEncodingResult;
    success:  boolean;
    errors:   CloudflareError[];
    messages: CloudflareMessage[];
}

interface ClouldflareEncodingResult {
    uid:                   string;
    thumbnail:             string;
    thumbnailTimestampPct: number;
    readyToStream:         boolean;
    status:                Status;
    meta:                  Meta;
    created:               Date;
    modified:              Date;
    size:                  number;
    preview:               string;
    allowedOrigins:        any[];
    requireSignedURLs:     boolean;
    uploaded:              Date;
    uploadExpiry:          null;
    maxSizeBytes:          number;
    maxDurationSeconds:    number;
    duration:              number;
    input:                 Input;
    playback:              Playback;
    watermark:             null;
}

interface Input {
    width:  number;
    height: number;
}

interface Meta {
    quickbyteId:       string;
    name:              string;
}

interface Playback {
    hls:  string;
    dash: string;
}

interface Status {
    // https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/#error-codes
    errorReasonCode?: string;
    pctComplete?: number;
    errorReasonText?: string;
    state: EncodingState;
}

type EncodingState = 'pendingupload'|'downloading'|'queued'|'inprogress'|'ready'|'error';

interface CloudflareMessage {
    code: number;
    message: string;
}

interface CloudflareError {
    code: number;
    message: string;
}

interface CreateWebhookResult {
    result: {
        notificationUrl: string;
        modified: string;
        secret: string;
    };
    success: boolean;
    errors: Array<{ code: number, message: string }>;
    messages: Array<{ code: number, message: string }>
}

// see: https://developers.cloudflare.com/stream/manage-video-library/using-webhooks
interface WebhookPayload {
    uid: string;
    readyToStream: boolean;
}
