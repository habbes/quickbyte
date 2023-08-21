import { BlockBlobClient } from "@azure/storage-blob";
import Zip from "jszip";
import type { DownloadRequestResult } from "../api-client";
import { ensure } from "../util";
import { type ZipDownloader } from "./types.js";


export class InMemoryZipDownloader implements ZipDownloader {
    async download(transfer: DownloadRequestResult): Promise<void> {
        const downloadTask = new DownloadTask(transfer);
        await downloadTask.download();
    }
}

class DownloadTask {
    private zip: Zip;
    constructor(private transfer: DownloadRequestResult) {
        this.zip = new Zip();
    }

    async download(): Promise<void> {
        const started = Date.now();
        const tasks = this.transfer.files.map(file => this.downloadFile(file));
        await Promise.all(tasks);
        console.log('generating zip', Date.now() - started);
        const content = await this.zip.generateAsync({
            compression: 'STORE',
            type: 'blob'
        }) as Blob;

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

    private async downloadFile(file: DownloadRequestResult["files"][0]) {
        console.log('downloading file', file.name);
        const client = new BlockBlobClient(file.downloadUrl);
        const result = await client.download();
        const blobResult = await result.blobBody;
        const blob = ensure(blobResult);
        console.log('complete download file', file.name, blob.size);
        this.zip.file(file.name, blob);
        console.log('adding file to zip', file.name);
    }
}