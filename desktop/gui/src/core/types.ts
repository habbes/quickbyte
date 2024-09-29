import type { DownloadTransferFileResult } from "@quickbyte/common";
export type JobStatus = 'pending' | 'completed' | 'cancelled' | 'error' | 'progress';

export interface TransferJob {
    _id: string;
    name: string;
    totalSize: number;
    completedSize: number;
    numFiles: number;
    localPath: string;
    status: JobStatus;
    error?: string;
    files: TransferFileJob[],
    type: TransferType;
    // add other fields, e.g. date fields
}

export type TransferType = 'upload'|'download';

export interface TransferFileJob {
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
    files: DownloadTransferFileResult[];
}

export interface LegacyTransferLinkDownloadRequest {
    transferId: string;
    name: string;
    targetPath: string;
    downloadRequestId: string;
    files: DownloadTransferFileResult[];
}

export interface UploadFilesRequest {
    transferId: string;
    name: string;
    projectId?: string;
    folderId?: string;
    localPath: string;
    files: UploadFilesRequestFile[];
}

export interface UploadFilesRequestFile {
    localPath: string;
    transferFile: UploadFilesRequestTransferFile;
}

export interface UploadFilesRequestTransferFile {
    _id: string;
    name: string;
    size: number;
    uploadUrl: string;
}

export interface FileSizesRequest {
    files: string[];
}

export interface FileSizeResponseItem {
    path: string;
    name: string;
    size: number;
}