import type { DownloadRequestResult } from '../api-client';

export interface ZipDownloader {
    /**
     * Downloads a zip file containing all the transfer's files to the user's device.
     * @param transfer transfer object with details of the files to download.
     * @param suggestFileName the suggested name of the target zip file.
     * Note that the user can change the name to something else.
     * @param onProgress callback that's triggered to report the current progress of the download as a percentage.
     * @param onFilePicked triggered when the target zip file name has been selected.
     * @throws operationCanceled error if user cancels the download.
     */
    download(
        transfer: ZipDownloadRequest,
        suggestFileName: string,
        onProgress: (currentPercentage: number) => void,
        onFilePicked: (fileName: string) => unknown
    ): Promise<void>;
}

export interface ZipDownloadRequest {
    name: string;
    files: ZipDownloadRequestFile[]
}

export interface ZipDownloadRequestFile {
    _id: string;
    name: string;
    size: number;
    downloadUrl: string;
}