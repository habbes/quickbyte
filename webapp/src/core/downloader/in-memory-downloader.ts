import { BlockBlobClient } from "@azure/storage-blob";
import Zip from "jszip";
import { ensure, executeTasksInBatches, isNetworkError } from "../util";
import type { ZipDownloader, ZipDownloadRequest, ZipDownloadRequestFile } from "./types.js";
import type { Logger  } from "..";


export class InMemoryZipDownloader implements ZipDownloader {
    constructor(private logger?: Logger) {}

    async download(
        transfer: ZipDownloadRequest,
        suggestedFileName: string,
        onProgress: (percentage: number) => unknown,
        onFilePicked: (fileName: string) => unknown,
    ): Promise<void> {
        const downloadTask = new DownloadTask(transfer, suggestedFileName, onProgress, onFilePicked, this.logger);
        await downloadTask.download();
    }
}

class DownloadTask {
    private zip: Zip;
    constructor(
        private transfer: ZipDownloadRequest,
        private suggestedFileName: string,
        private onProgress: (progressPercent: number) => unknown,
        private onFilePicked: (fileName: string) => unknown,
        private logger?: Logger,
    ) {
        this.zip = new Zip();
    }

    async download(): Promise<void> {
        // Since we start the download of the individual files immediately
        // And since we won't be able to control the final download
        // of the generated zip file, we just trigger the onFilePick event
        // immediately with the suggested file name, even if it may
        // differ from the final name of the downloaded zip
        this.onFilePicked(this.suggestedFileName);
        const started = Date.now();
        let totalDownloadProgress = 0;
        let lastReportedDownloadProgress = 0;
        const totalFilesSize = this.transfer.files.reduce((sizeSoFar, file) => sizeSoFar + file.size, 0);
        // for simplicity we use the combine download and zipping progress in the same callback
        // However, downloading and zipping are done separately, when we're updating the download progress
        // we don't know how long zipping will take. To make things simple, we'll arbitrarily cap the download
        // progress updates at 96% and update the remaining 4% from zipping progress
        const cappedFileDownloadPercentage = 96;
        const downloadProgresses = new Map<string, number>();
        

        const updateDownloadProgress = (fileName: string, progress: number) => {
            const lastProgress = downloadProgresses.get(fileName) || 0;
            totalDownloadProgress += (progress - lastProgress);
            downloadProgresses.set(fileName, progress);
            const percentage = Math.min(100 * totalDownloadProgress/totalFilesSize, cappedFileDownloadPercentage);
            lastReportedDownloadProgress = percentage;
            this.onProgress(percentage);
        }

        const batchSize = 16;
        await executeTasksInBatches(
            this.transfer.files,
            file => this.downloadFile(
                file,
                (downloadProgress) => updateDownloadProgress(file.name, downloadProgress)
            ),
            batchSize
        );

        const updateZipProgress = (metadata: Zip.JSZipMetadata) => {
            // we only update the progress when it exceeds the percentage reached
            // by the download progress
            const percentage = Math.max(metadata.percent, lastReportedDownloadProgress);
            // We don't need to update the last reported progress at this
            // point. If we've exceeded it, then subsequent progress updates will also
            // exceed it and report new progress update
            this.onProgress(percentage);
        }
        
        this.logger?.log('generating zip', Date.now() - started);
        const content = await this.zip.generateAsync({
            compression: 'STORE',
            type: 'blob'
        }, updateZipProgress) as Blob;

        this.logger?.log('generating object url', Date.now() - started);
        const url = URL.createObjectURL(content);
        this.logger?.log('generating link element', Date.now() - started);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.suggestedFileName;

        const clickHandler = () => {
            setTimeout(() => {
                URL.revokeObjectURL(url);
                removeEventListener('click', clickHandler);
            }, 150);
        };
    
        // Add the click event listener on the anchor element
        // Comment out this line if you don't want a one-off download of the blob content
        a.addEventListener('click', clickHandler, false);

        this.logger?.log('clicked download', Date.now() - started);
        a.click();
    }

    private async downloadFile(file: ZipDownloadRequestFile, onProgress: (currentProgress: number) => unknown) {
        this.logger?.log('downloading file', file.name);
        const client = new BlockBlobClient(file.downloadUrl);
        let retry = true;
        while (retry) {
            try {
                const result = await client.download(undefined, undefined, {
                    onProgress: (progress) => {
                        onProgress(progress.loadedBytes)
                    }
                });

                const blobResult = await result.blobBody;
                const blob = ensure(blobResult);
                this.logger?.log('complete download file', file.name, blob.size);
                this.zip.file(file.name, blob);
                this.logger?.log('adding file to zip', file.name);
                retry = false;
            } catch (e) {
                this.logger?.log('e', isNetworkError(e), e);
                if (isNetworkError(e)) {
                    retry = true;
                }
                else {
                    retry = false;
                    throw e;
                }
            }
        }
    }
}