import type { DownloadRequestResult } from '../api-client';

export interface ZipDownloader {
    download(transfer: DownloadRequestResult): Promise<void>;
}