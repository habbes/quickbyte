
export type TransferJob = UploadTransferJob | DownloadTransferJob;

export type JobStatus = 'pending' | 'completed' | 'cancelled' | 'error' | 'progress';

interface BaseTransferJob {
    _id: string;
    name: string;
    totalSize: number;
    completedSize: number;
    numFiles: number;
    localPath: string;
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

export interface SharedLinkDownloadRequest {
    shareId: string;
    shareCode: string;
    name: string;
    targetPath: string;
    files: SharedLinkDownloadRequestFile[];
}

export interface SharedLinkDownloadRequestFile {
    _id: string;
    transferId: string;
    name: string;
    size: number;
    accountId: string;
    downloadUrl: string;
    _createdAt: string;
}

export function getTransferCompletedSize(transfer: TransferJob) {
    if (transfer.type === 'download') {
        return transfer.files.reduce((sizeSoFar, file) => sizeSoFar + file.completedSize, 0);
    }

    return 0;
}