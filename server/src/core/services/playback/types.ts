import { TransferFile, FileOptimizeResult } from '@quickbyte/common';

export interface PlaybackOptimizer {

    optimizeFile(file: TransferFile): Promise<FileOptimizeResult>;
    getOptimizationMetadata(file: TransferFile): Promise<FileOptimizeResult>;
    handleServiceEvent(event: unknown): Promise<void>
}


