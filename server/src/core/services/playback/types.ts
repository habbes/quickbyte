import { TransferFile, PlaybackPackagingResult } from '@quickbyte/common';

export interface PlaybackPackager {
    canPackage(file: TransferFile): boolean;
    optimizeFile(file: TransferFile): Promise<PlaybackPackagingResult>;
    getOptimizationMetadata(file: TransferFile): Promise<PlaybackPackagingResult>;
    handleServiceEvent(event: unknown): Promise<void>
}


