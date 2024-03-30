import { TransferFile, PlaybackPackagingResult } from '@quickbyte/common';

export interface PlaybackPackager {
    name(): string;
    canPackage(file: TransferFile): boolean;
    startPackagingFile(file: TransferFile): Promise<PlaybackPackagingResult>;
    getPackagingInfo(file: TransferFile): Promise<PlaybackPackagingResult>;
    handleServiceEvent(event: unknown): Promise<PackagingEventHandlingResult>
}

export interface PackagingEventHandlingResult {
    providerId?: string;
    handled: boolean;
}