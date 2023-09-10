import type { Logger } from "..";
import { DirectFileSystemZipDownloader } from "./direct-fs-downloader";
import { InMemoryZipDownloader } from "./in-memory-downloader";
import { type ZipDownloader } from "./types.js";

export class DownloaderProvider {
    constructor(private logger?: Logger) {
    }

    getDownloader(): ZipDownloader {
        // TODO: declare this API
        // @ts-ignore
        if (window.showSaveFilePicker) {
            return new DirectFileSystemZipDownloader(this.logger);
        }

        return new InMemoryZipDownloader(this.logger);
    }

    /**
     * Checks whether the browser supports the
     * optimal-download method (using showSaveFilePicker)
     */
    isOptimalDownloaderSupported(): boolean {
        // @ts-ignore
        return !!window.showSaveFilePicker;
    }
}