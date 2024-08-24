
export type TransferJob = UploadTransferJob | DownloadTransferJob;

export type JobStatus = 'pending' | 'completed' | 'cancelled' | 'error' | 'progress';

interface BaseTransferJob {
    _id: string;
    name: string;
    totalSize: number;
    completedSize: number;
    numFiles: number;
    status: JobStatus;
    error?: string;
    // add other fields, e.g. date fields
}

interface UploadTransferJob extends BaseTransferJob {
    type: 'upload';
}

interface DownloadTransferJob extends BaseTransferJob {
    type: 'download';
    files: DownloadTransferFileJob[]
}

export interface DownloadTransferFileJob {
    _id: string;
    name: string;
    size: number;
    completedSize: number;
    remoteUrl: string;
    localPath: string;
    status: JobStatus
}
