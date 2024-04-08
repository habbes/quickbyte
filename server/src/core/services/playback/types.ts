import { TransferFile, PlaybackPackagingResult, PlaybackUrls } from '@quickbyte/common';

export interface PlaybackPackager {
    name(): string;
    canPackage(file: TransferFile): boolean;
    startPackagingFile(file: TransferFile): Promise<PlaybackPackagingResult>;
    getPackagingInfo(file: TransferFile): Promise<PlaybackPackagingResult>;
    handleServiceEvent(event: unknown): Promise<PackagingEventHandlingResult>
    getPlaybackUrls(file: TransferFile): Promise<PlaybackUrls>;
}

export interface PackagingEventHandlingResult {
    providerId?: string;
    handled: boolean;
}