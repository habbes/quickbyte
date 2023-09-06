import type { DownloadRequestResult } from '../api-client';

export interface ZipDownloader {
    download(transfer: DownloadRequestResult, onProgress: (currentPercentage: number) => void): Promise<void>;
}