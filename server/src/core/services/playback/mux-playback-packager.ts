import Mux from '@mux/mux-node';
import { Request } from 'express';
import { PackagingEventHandlingResult, PlaybackPackager } from './types.js';
import { TransferFile, PlaybackPackagingResult, PlaybackUrls, getFileName, getMediaType } from '@quickbyte/common';
import { getDownloadUrl } from '../storage/storage-utils.js';
import { IStorageHandlerProvider } from '../storage/storage-provider-registry.js';
import { createInvalidAppStateError } from '../../error.js';
import { EventDispatcher } from '../event-bus/event-bus.js';

export const MUX_PLAYBACK_PACKAGER_NAME = 'mux';

export interface MuxConfig {
    tokenId: string;
    tokenSecret: string;
    storageHandlers: IStorageHandlerProvider;
    events: EventDispatcher;
    webhookSecret: string;
}

export class MuxPlaybackPackager implements PlaybackPackager {
    private client: Mux;

    constructor(private readonly config: MuxConfig) {
        this.client = new Mux({
            tokenId: config.tokenId,
            tokenSecret: config.tokenSecret
        });
    }

    name(): string {
        return MUX_PLAYBACK_PACKAGER_NAME;
    }
    canPackage(file: TransferFile): boolean {
        const fileName = getFileName(file);
        const fileKind = getMediaType(fileName);
        return fileKind === 'video' || fileKind === 'audio';
    }
    async startPackagingFile(file: TransferFile): Promise<PlaybackPackagingResult> {
        // see: https://docs.mux.com/core/stream-video-files
        const storageHandler = this.config.storageHandlers.getHandler(file.provider);
        const DOWNLOAD_VALIDITY = 24 * 60 * 60 * 100; // 1 day
        const expirtyDate = new Date(Date.now() + DOWNLOAD_VALIDITY);
        const downloadUrl = await getDownloadUrl(storageHandler, file, expirtyDate);
        const fileKind = getMediaType(getFileName(file));
        const asset = await this.client.video.assets.create({
            input: [{ 
                url: downloadUrl
            }],
            playback_policy: ['public'], // TODO make private
            // we prefer baseline cause it's cheaper, but doesn't support 4k video or audio-only stream
            // currently we haven't rolled out 4k support yet
            // so we enable smart tier for audio-only streams
            // see: https://docs.mux.com/pricing/video#encoding
            encoding_tier: fileKind === 'audio'? 'smart' : 'baseline',
        });
        
        const result = convertAssetToQuickbyteResult(asset);

        return result;
    }

    async getPackagingInfo(file: TransferFile): Promise<PlaybackPackagingResult> {
        if (file.playbackPackagingProvider !== this.name()) {
            throw createInvalidAppStateError(
                `Attempting to get packaging info of file '${file._id}' using mux packager, but was packaged with '${file.playbackPackagingProvider}'`
            );
        }

        if (!file.playbackPackagingId) {
            throw createInvalidAppStateError(
                `Attempting to get packaging info of file '${file._id}' without a packaging id`
            );
        }

        const asset = await this.client.video.assets.retrieve(file.playbackPackagingId);
        const result = convertAssetToQuickbyteResult(asset);
        return result;
    }

    async handleServiceEvent(event: unknown): Promise<PackagingEventHandlingResult> {
        // see: https://docs.mux.com/core/listen-for-webhooks
        const request = event as Request;
        const headers = request.headers;

        try {
            this.client.webhooks.verifySignature(request.body, headers, this.config.webhookSecret);
        } catch (e: any) {
            console.error('Invalid mux webhook signature', e);
            return {
                handled: true
            }
        }

        const data = JSON.parse(request.body) as MuxEvent;
        console.log(`Processing mux event ${data.type}`);
        if (data.type !== 'video.asset.ready' && data.type !== 'video.asset.errored' && data.object?.type !== 'asset') {
            console.log('Ignoring event...');
            return {
                handled: true
            }
        }

        const assetId = data.object?.id;
        if (!assetId) {
            console.error(`Mux Asset ID not found in event. Aborting...`);
            return {
                handled: true
            };
        }

        await this.config.events.send({
            type: 'filePlaybackPackagingUpdated',
            data: {
                packager: this.name(),
                packagerId: assetId
            }
        });

        return {
            handled: true,
            providerId: assetId
        };
    }

    async getPlaybackUrls(file: TransferFile): Promise<PlaybackUrls> {
        if (file.playbackPackagingProvider !== this.name()) {
            throw createInvalidAppStateError(
                `Attempting to get packaging info of file '${file._id}' using mux packager, but was packaged with '${file.playbackPackagingProvider}'`
            );
        }

        if (!file.playbackPackagingId) {
            throw createInvalidAppStateError(
                `Attempting to get packaging info of file '${file._id}' without a packaging id`
            );
        }
        const asset = await this.client.video.assets.retrieve(file.playbackPackagingId);
        if (!asset.playback_ids || !asset.playback_ids.length) {
            console.warn(
                `No playback ids available for file '${file._id}' using mux asset id '${file.playbackPackagingId}'. Cannot generate playback urls.`
            );
            return {};
        }

        if (asset.status !== 'ready') {
            // If we return playback urls when the asset is not ready, the player will throw errors attempting to play the hls source.
            // So we don't return the playback urls, that way the player can fall back to using the download url.
            console.log(`Attempting to get playback url of file that is not ready '${file._id}' asset '${file.playbackPackagingId}'. Cannot generate playback urls.`);
            return {};
        }

        const playbackId = asset.playback_ids[0];
        
        // Couldn't find any infor on MPEG-DASH support on Mux's website
        const urls: PlaybackUrls = {
            // see: https://docs.mux.com/guides/play-your-videos
            hlsManifestUrl: `https://stream.mux.com/${playbackId.id}.m3u8`,
            // see: https://docs.mux.com/guides/get-images-from-a-video
            thumbnailUrl: `https://stream.mux.com/${playbackId.id}/thumbnail.webp`,
            posterUrl: `https://stream.mux.com/${playbackId.id}/thumbnail.webp`,
        };

        return urls;
    }
}

function convertAssetToQuickbyteResult(asset: Mux.Video.Asset) {
    const result: PlaybackPackagingResult = {
        providerId: asset.id,
        error: asset.errors ? asset.errors.messages?.join(" ") : undefined,
        status: asset.status === 'ready' ? 'success'
            : asset.status === 'errored' ? 'error'
            : 'progress',
        metatada: asset
    };

    return result;
}


// see: https://docs.mux.com/core/listen-for-webhooks
interface MuxEvent {
    type: string;
    object: {
        type: string;
        id: string;
    }
    // we don't care about the other fields in the event
}
