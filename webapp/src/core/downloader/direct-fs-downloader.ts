import { type DownloadRequestResult } from "../api-client.js";
import { type ZipDownloader } from "./types.js";


export class DirectFileSystemZipDownloader implements ZipDownloader {
    async download(transfer: DownloadRequestResult): Promise<void> {
        console.log('using direct-fs');
        // @ts-ignore
        const handle: FileSystemFileHandle = await window.showSaveFilePicker({ suggestedName: `${transfer.name}.zip`});

        const writable = await handle.createWritable();
        await writable.write({ position: 10, data: "test", type: 'write' });

        await writable.close();
    }
}
