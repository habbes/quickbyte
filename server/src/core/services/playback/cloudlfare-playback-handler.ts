import { Axios } from 'axios';
import { FileOptimizationStatus, FileOptimizeResult, getFileName, TransferFile } from "@quickbyte/common";
import { PlaybackOptimizer } from "./types.js";
import { StorageHandlerProvider, getDownloadUrl } from "../storage/index.js";

interface CloudflareConfig {
    accountId: string;
    apiToken: string;
    storageProviders: StorageHandlerProvider
}

// see: https://developers.cloudflare.com/stream/get-started/

export class CloudflarePlaybackHandler implements PlaybackOptimizer {
    private client: Axios;

    constructor(private config: CloudflareConfig) {
        this.client = new Axios({
            baseURL: `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/`,
            headers: {
                Authorization: `Bearer ${config.apiToken}`,
                "Content-Type": "application/json",
            }
        });;
    }

    async optimizeFile(file: TransferFile): Promise<FileOptimizeResult> {
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

    async getOptimizationMetadata(file: TransferFile): Promise<FileOptimizeResult> {
        const response = await this.client.get<CloudflareStreamUploadResult>(`stream/${file.playbackOptimizationId}`);
        const data = response.data;

        const result = convertToQuickbyteResult(data);

        return result;
    }

    handleServiceEvent(event: unknown): Promise<void> {
        throw new Error("Method not implemented.");
    }
}

function convertToQuickbyteResult(data: CloudflareStreamUploadResult): FileOptimizeResult {
    const result: FileOptimizeResult = {
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

function convertToQuickbyteStatus(sourceStatus: EncodingState): FileOptimizationStatus {
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