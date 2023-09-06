import { BlockBlobClient } from "@azure/storage-blob";
import Zip from "jszip";
import type { DownloadRequestResult } from "../api-client";
import { ensure } from "../util";
import { type ZipDownloader } from "./types.js";


export class InMemoryZipDownloader implements ZipDownloader {
    async download(transfer: DownloadRequestResult, onProgress: (percentage: number) => unknown): Promise<void> {
        const downloadTask = new DownloadTask(transfer, onProgress);
        await downloadTask.download();
    }
}

class DownloadTask {
    private zip: Zip;
    constructor(private transfer: DownloadRequestResult, private onProgress: (progressPercent: number) => unknown) {
        this.zip = new Zip();
    }

    async download(): Promise<void> {
        const started = Date.now();
        let totalDownloadProgress = 0;
        let lastReportedDownloadProgress = 0;
        const totalFilesSize = this.transfer.files.reduce((sizeSoFar, file) => sizeSoFar + file.size, 0);
        // for simplicity we use the combine download and zipping progress in the same callback
        // However, downloading and zipping are done separately, when we're updating the download progress
        // we don't know how long zipping will take. To make things simple, we'll cap the download
        // progress updates at 70% and update the remaining 30% from zipping progress
        const cappedFileDownloadPercentage = 70;
        const downloadProgresses = new Map<string, number>();
        

        const updateDownloadProgress = (fileName: string, progress: number) => {
            const lastProgress = downloadProgresses.get(fileName) || 0;
            totalDownloadProgress += (progress - lastProgress);
            downloadProgresses.set(fileName, progress);
            const percentage = Math.min(totalDownloadProgress/totalFilesSize, cappedFileDownloadPercentage);
            lastReportedDownloadProgress = percentage;
            this.onProgress(percentage);
        }

        const tasks = this.transfer.files.map(
            file => this.downloadFile(
                file,
                (downloadProgress) => updateDownloadProgress(file.name, downloadProgress)
            )
        );

        await Promise.all(tasks);

        const updateZipProgress = (metadata: Zip.JSZipMetadata) => {
            // we only update the progress when it exceeds the percentage reached
            // by the download progress
            const percentage = Math.max(metadata.percent, lastReportedDownloadProgress);
            // We don't need to update the last reported progress at this
            // point. If we've exceeded it, then subsequent progress updates will also
            // exceed it and report new progress update
            this.onProgress(percentage);
        }
        
        console.log('generating zip', Date.now() - started);
        const content = await this.zip.generateAsync({
            compression: 'STORE',
            type: 'blob'
        }, updateZipProgress) as Blob;

        console.log('generating object url', Date.now() - started);
        const url = URL.createObjectURL(content);
        console.log('generating link element', Date.now() - started);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.transfer.name}.zip`;

        const clickHandler = () => {
            setTimeout(() => {
                URL.revokeObjectURL(url);
                removeEventListener('click', clickHandler);
            }, 150);
        };
    
        // Add the click event listener on the anchor element
        // Comment out this line if you don't want a one-off download of the blob content
        a.addEventListener('click', clickHandler, false);

        console.log('clicked download', Date.now() - started);
        a.click();
    }

    private async downloadFile(file: DownloadRequestResult["files"][0], onProgress: (currentProgress: number) => unknown) {
        console.log('downloading file', file.name);
        const client = new BlockBlobClient(file.downloadUrl);
        const result = await client.download(undefined, undefined, {
            onProgress: (progress) => {
                onProgress(progress.loadedBytes)
            }
        });
        const blobResult = await result.blobBody;
        const blob = ensure(blobResult);
        console.log('complete download file', file.name, blob.size);
        this.zip.file(file.name, blob);
        console.log('adding file to zip', file.name);
    }
}