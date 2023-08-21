import { DirectFileSystemZipDownloader } from "./direct-fs-downloader";
import { InMemoryZipDownloader } from "./in-memory-downloader";
import { ZipDownloader } from "./types.js";

export class DownloaderProvider {
    getDownloader(): ZipDownloader {
        // TODO: return direct file downloader if supported
        // // TODO: declare this API
        // // @ts-ignore
        // if (window.showSaveFilePicker) {
        //     return new DirectFileSystemZipDownloader();
        // }

        return new InMemoryZipDownloader();
    }
}