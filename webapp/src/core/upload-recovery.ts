
const VERSION = 1;

export class UploadRecoveryManager {
    init(): Promise<void> {
        return Promise.reject('Not implemented');
    }

    createUploadTracker(upload: TrackedUpload): UploadTracker {
        return new UploadTracker();
    }

    getRecoveredUploads(): Promise<TrackedUpload[]> {
        return Promise.reject('Not implemented');
    }
}

export class UploadTracker {
    completeBlock(block: TrackedBlock): Promise<void> {
        return Promise.reject('Not implemented');
    }

    completeUpload(): Promise<void> {
        return Promise.reject('Not implemented');
    }
}

interface TrackedUpload {
    id: string;
    filename: string;
    size: number;
    blockSize: number;
    hash: string;
}

interface TrackedBlock {
    id: string;
    index: number;
}