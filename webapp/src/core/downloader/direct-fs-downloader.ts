import { type DownloadRequestResult } from "../api-client.js";
import { type ZipDownloader } from "./types.js";
import { ensure, executeTasksInBatches, isNetworkError, noop } from '../util.js';
import { crc32, CrcTracker } from '../crc.js';
import { BlockBlobClient } from "@azure/storage-blob";
import { createOperationCancelledError, type Logger } from "..";

// See ZIP file format: https://en.wikipedia.org/wiki/ZIP_(file_format)

// The size of the local file header before the name
const LOCAL_HEADER_BASE_SIZE = 30;
const CENTRAL_HEADER_BASE_SIZE = 46;
const END_OF_CENTRAL_DIR_BASE_SIZE = 22;
const BLOCK_SIZE = 16 * 1024 * 1024;

export class DirectFileSystemZipDownloader implements ZipDownloader {
    constructor(private logger?: Logger) {

    }

    async download(
        transfer: DownloadRequestResult,
        suggestedFileName: string,
        onProgress: (currentPercentage: number) => unknown,
        onFilePicked: (fileName: string) => unknown,
    ): Promise<void> {
        this.logger?.debug('using direct-fs downloader');

        const handle = await getFileHandle(suggestedFileName);
        onFilePicked(handle.name);
        
        const started = Date.now();
        // calculate local header length and offsets for each file
        const zipEntries = generateZipEntryData(transfer.files);
        const { totalZipSize } = zipEntries;

        let totalProgress = 0;
        const fileProgresses = new Map<string, number>();

        const incrementProgress = (value: number) => {
            totalProgress += value;
            onProgress(Math.min(100 * totalProgress / totalZipSize, 100));
        }

        const setFileProgress = (path: string, currentFileProgress: number) => {
            const lastFileProgress = fileProgresses.get(path) || 0;
            totalProgress += (currentFileProgress - lastFileProgress);
            fileProgresses.set(path, currentFileProgress);
            onProgress(Math.min(100 * totalProgress / totalZipSize, 100));
        }

        this.logger?.debug(`Generated zip entries after ${Date.now()-started}`);

        // @ts-ignore
        const writable = await handle.createWritable();

        const downloadTasks = executeTasksInBatches(
            transfer.files,
            file => {
                const downloader = new FileDownloader(
                    writable,
                    file,
                    ensure(zipEntries.entries.get(file._id)),
                    BLOCK_SIZE,
                    this.logger,
                    fileProgress => setFileProgress(file.name, fileProgress)
                );
                return downloader.download()
            },
            16);
        await downloadTasks;

        await writeEndOfCentralDirectory(writable, zipEntries.eocd, incrementProgress);

        await writable.close();
        this.logger?.debug(`Complete download after ${Date.now() - started}`);
    }
}

class FileDownloader {
    private client: BlockBlobClient;
    private currentProgress: number = 0;
    private crcTracker: CrcTracker;

    constructor(
        // @ts-ignore
        private writer: FileSystemWritableFileStream,
        private file: DownloadRequestResult["files"][0],
        private zipEntry: ZipFileEntry,
        private blockSize: number,
        private logger?: Logger,
        private onProgress?: (progress: number) => unknown
    ) {
        this.client = new BlockBlobClient(file.downloadUrl);
        this.crcTracker = new CrcTracker(
            Math.ceil(file.size / this.blockSize)
        );
    }

    async download(): Promise<void> {
        this.logger?.debug(`Downloading file ${this.zipEntry.name}`);
        const started = Date.now();

        const incrementProgress = (value: number) => {
            this.currentProgress += value;
            this.onProgress && this.onProgress(this.currentProgress);
        }

        const tasks = [
            writeLocalHeader(this.writer, this.zipEntry, incrementProgress),
            this.downloadInChunks(incrementProgress),
            writeCentralDirectoryHeader(this.writer, this.zipEntry, incrementProgress)
        ];

        await Promise.all(tasks);

        const finalCrc = this.crcTracker.computeFinalCrc();
        writeFileCrc32(this.writer, finalCrc, this.zipEntry);
        this.logger?.debug(`Completed zip of file ${this.zipEntry.name} in ${Date.now() - started}`);
    }

    private async downloadWholeFile(): Promise<void> {
        this.logger?.debug(`Downloading file ${this.zipEntry.name}`);
        const started = Date.now();
        const result = await this.downloadFile();
        const blob = ensure(await result.blobBody);
        const blobBuffer = await blob.arrayBuffer();
        const blobData = new Uint8Array(blobBuffer);

        this.logger?.debug(`Completed download of file ${this.zipEntry.name} in ${Date.now() - started}. Preparing zip...`);
        
        const checksum = crc32(blobData);
        this.logger?.debug(`Calculated checksum of file ${this.zipEntry.name} after ${Date.now() - started}`);
        this.zipEntry.checksum = checksum;
        this.zipEntry.hasChecksum = true;

        const incrementProgress = (value: number) => {
            this.currentProgress += value;
            this.onProgress && this.onProgress(this.currentProgress);
        }

        const tasks = [
            writeLocalHeader(this.writer, this.zipEntry, incrementProgress),
            // Since we update file progress when downloading the file,
            // we skip updating progress when adding the downloaded file to the zip
            writeCompleteFileData(this.writer, this.zipEntry, blobData, noop),
            writeCentralDirectoryHeader(this.writer, this.zipEntry, incrementProgress)
        ];

        await Promise.all(tasks);
        this.logger?.debug(`Completed zip of file ${this.zipEntry.name} in ${Date.now() - started}`);
    }

    private async downloadInChunks(incrementProgress: (value: number) => unknown): Promise<void> {
        const totalBlocks = Math.ceil(this.file.size / this.blockSize)
        const blocks = new Array<{ index: number, size: number}>(totalBlocks);
        let remainingSize = this.file.size;
        // TODO improve this code, we don't need a loop or even to create an array
        for (let i = 0; i < blocks.length; i++) {
            const blockSize = Math.min(this.blockSize, remainingSize);
            blocks[i] = { index: i, size: blockSize };
            remainingSize -= blockSize;
        }

        const numWorkers = 16;
        await executeTasksInBatches(
            blocks,
            (block) => this.downloadBlock(block.index, block.size, incrementProgress),
            numWorkers
        );
    }

    private async downloadBlock(index: number, size: number, incrementProgress: (value: number) => unknown) {
        const offset = index * this.blockSize;
        let retry = true;
        let lastUpdatedProgress = 0;
        while (retry) {
            try {
                const result = await this.client.download(offset, size, {
                    onProgress: (progress) => {
                        const addedProgress = progress.loadedBytes - lastUpdatedProgress;
                        incrementProgress(addedProgress);
                        lastUpdatedProgress = progress.loadedBytes;
                    }
                });

                const blob = await ensure(result.blobBody);
                const buffer = await blob.arrayBuffer();
                const data = new Uint8Array(buffer);

                await writeFileChunk(
                    this.writer,
                    this.zipEntry,
                    offset,
                    data,
                );
                
                this.crcTracker.updateChunk(data, index);
                
                retry = false;
            } catch (e) {
                if (isNetworkError(e)) {
                    this.logger?.warn(`Network error occur, retrying download of block ${index} of ${this.file.name}: ${e}`);
                    retry = true;
                    // TODO revisit
                    lastUpdatedProgress = -lastUpdatedProgress;
                } else {
                    throw e;
                }
            }
        }
    }

    private async downloadFile() {
        let retry = true;
        let lastUpdatedProgress = 0;
        while (retry) {
            try {
                const result = await this.client.download(undefined, undefined, {
                    onProgress: (progress) => {
                        this.currentProgress += progress.loadedBytes - lastUpdatedProgress;
                        lastUpdatedProgress = progress.loadedBytes;
                    }
                });
                return result;
            } catch (e) {
                if (isNetworkError(e)) {
                    this.logger?.warn(`Network error occur, retrying download for ${this.file.name}: ${e}`);
                    retry = true;
                } else {
                    throw e;
                }
            }
        }

        throw new Error('should not reach here');
    }
}

async function getFileHandle(filename: string): Promise<FileSystemFileHandle> {
    try {
        // @ts-ignore
        const handle: FileSystemFileHandle = await window.showSaveFilePicker({ suggestedName: filename });
        return handle;
    } catch (e: any) {
        if ((e as Error).message.includes('abort')) {
            throw createOperationCancelledError(e.message);
        }

        throw e;
    }
}

// @ts-ignore
async function writeCompleteFileData(writer: FileSystemWritableFileStream, entry: ZipFileEntry, data: Uint8Array, incrementProgress: (value: number) => unknown) {
    const offset = entry.localHeaderOffset + entry.localHeaderTotalSize;
    await writer.write({ position: offset, data, type: 'write' });
    incrementProgress(data.length);
}

// @ts-ignore
async function writeFileChunk(writer: FileSystemWritableFileStream, entry: ZipFileEntry, blockOffset: number, data: Uint8Array) {
    const offsetInFile = entry.localHeaderOffset + entry.localHeaderTotalSize + blockOffset;
    await writer.write({ position: offsetInFile, data, type: 'write'});
}

// @ts-ignore
async function writeLocalHeader(writer: FileSystemWritableFileStream, entry: ZipFileEntry, incrementProgress: (value: number) => unknown) {
    const headerData = new Uint8Array(entry.localHeaderTotalSize);
    const dataView = new DataView(headerData.buffer);
    
    // off: 0, 4 bytes: Local file header signature = 0x04034b50 (PK♥♦ or "PK\3\4")
    const offset = entry.localHeaderOffset;
    dataView.setUint32(0, 0x04034b50, true);
    // skip offset 4 to 13 (version, general purpose bit flag, compression method, last mod time, last mod date)
    
    // CRC-32 of uncompressed data
    if (entry.hasChecksum) {
        dataView.setUint32(14, entry.checksum, true);
    }
    // Compressed size
    dataView.setUint32(18, entry.size, true);
    // Uncompressied size
    dataView.setUint32(22, entry.size, true);
    // File name length
    dataView.setUint16(26, entry.encodedName.length, true);
    // Extra field length
    dataView.setUint16(28, 0, true);
    // File name
    headerData.set(entry.encodedName, 30);
  
    // write header
    await writer.write({ data: headerData, position: offset, type: 'write' });
    incrementProgress(headerData.length);
}

// @ts-ignore
async function writeCentralDirectoryHeader(writer: FileSystemWritableFileStream, entry: ZipFileEntry, incrementProgress: (value: number) => unknown) {
    const header = new Uint8Array(entry.centralHeaderTotalSize);
    const dataView = new DataView(header.buffer);

    // 0, 4, Central directory file header signature = 0x02014b50
    dataView.setUint32(0, 0x02014b50, true);
    // CRC-32 of uncompressed data
    if (entry.hasChecksum) {
        dataView.setUint32(16, entry.checksum, true);
    }

    dataView.setUint32(20, entry.size, true);
    dataView.setUint32(24, entry.size, true);
    dataView.setUint16(28, entry.encodedName.length, true);
    // Disk number
    dataView.setUint32(34, 0, true);
    // 42, relative offset of local file header
    dataView.setUint32(42, entry.localHeaderOffset, true);
    // file name
    header.set(entry.encodedName, 46);

    await writer.write({ position: entry.centralHeaderOffset, data: header, type: 'write' });
    incrementProgress(header.length);
}

// @ts-ignore
async function writeEndOfCentralDirectory(writer: FileSystemWritableFileStream, entry: EndOfCentralDirEntry, incrementProgress: (value: number) => unknown) {
    const header = new Uint8Array(entry.eocdSize);
    const eocdDataView = new DataView(header.buffer);
    // End of central directory signature = 0x06054b50
    eocdDataView.setUint32(0, 0x06054b50, true);
    // Number of central directory records on this disk (or 0xffff for ZIP64)
    eocdDataView.setUint16(8, 1, true);
    // Total number of central directory records (or 0xffff for ZIP64)
    eocdDataView.setUint16(10, 1, true);
    // Size of central directory (bytes) (or 0xffffffff for ZIP64)
    eocdDataView.setUint32(12, entry.centralDirSize, true);
    // Offset of start of central directory, relative to start of archive (or 0xffffffff for ZIP64)
    eocdDataView.setUint32(16, entry.centralDirOffset, true);

    await writer.write({ position: entry.eocdOffset, data: header, type: 'write' });
    incrementProgress(header.length);
}

// @ts-ignore
async function writeFileCrc32(writer: FileSystemWritableFileStream, crc32: number, entry: ZipFileEntry) {
    const crcBytes = new Uint8Array(4);
    const dataView = new DataView(crcBytes.buffer);
    dataView.setUint32(0, crc32, true);

    // TODO: perhaps we should write the local and central headers after the file download is complete
    // so that we can write te crc at the same time as the other headers. This would
    // avoid the overhead of writing a small payload in isolation

    // in the local header we write the crc at offset 14
    const localOffset = entry.localHeaderOffset + 14;
    // TODO: should these writes be done concurrently?
    await writer.write({ position: localOffset, data: crcBytes, type: 'write' });
    // in the central header, the crc is at offset 16
    const centralOffset = entry.centralHeaderOffset + 16;
    await writer.write({ position: centralOffset, data: crcBytes, type: 'write' });
}

function generateZipEntryData(files: DownloadRequestResult['files']): ZipEntryInfo {
    const zipEntries = new Map<string, ZipFileEntry>();
    const encoder = new TextEncoder();
    let currentOffset = 0;
    for (const file of files) {
        const encodedName = encoder.encode(file.name);
        const entry: ZipFileEntry = {
            id: file._id,
            name: file.name,
            encodedName,
            size: file.size,
            localHeaderTotalSize: LOCAL_HEADER_BASE_SIZE + encodedName.length,
            localHeaderOffset: currentOffset,
            centralHeaderTotalSize: CENTRAL_HEADER_BASE_SIZE + encodedName.length,
            // this will be calculated in the second pass
            centralHeaderOffset: 0,
            hasChecksum: false,
            checksum: 0
        };

        zipEntries.set(entry.id, entry);

        // next file header will be header size + data size
        currentOffset += entry.localHeaderTotalSize + entry.size;
    }

    // the currentOffset is now the beginning of the central directory
    const centralDirOffset = currentOffset;
    
    // we execute a second pass to compute the central header offset for each file
    for (const file of files) {
        const entry = ensure(zipEntries.get(file._id));
        entry.centralHeaderOffset = currentOffset;
        currentOffset += entry.centralHeaderTotalSize;
    }

    const centralDirSize = currentOffset - centralDirOffset;
    const eocdOffset = currentOffset;

    const eocdEntry: EndOfCentralDirEntry = {
        numEntries: files.length,
        centralDirOffset,
        centralDirSize,
        eocdOffset,
        eocdSize: END_OF_CENTRAL_DIR_BASE_SIZE
    };

    const totalZipSize = centralDirOffset + eocdEntry.centralDirSize + eocdEntry.eocdSize;

    return { entries: zipEntries, eocd: eocdEntry, totalZipSize };
}


interface ZipEntryInfo {
    entries: Map<string, ZipFileEntry>;
    eocd: EndOfCentralDirEntry;
    totalZipSize: number;
}


interface ZipFileEntry {
    id: string;
    name: string;
    size: number;
    localHeaderTotalSize: number;
    encodedName: Uint8Array;
    localHeaderOffset: number;
    centralHeaderTotalSize: number;
    centralHeaderOffset: number;
    checksum: number;
    hasChecksum?: boolean;
}

interface EndOfCentralDirEntry {
    numEntries: number;
    /**
     * Total size of the central directory size. This is a sum
     * of the sizes of the central directory headers of all the files.
     * It excludes the size of the end-of-central directory record.
     */
    centralDirSize: number;
    /**
     * The position in the file where the central directory begins. This
     * is the first of the first central header.
     */
    centralDirOffset: number;
    /**
     * The position in the file where the end-of-central-directory record
     * begins. This should come after the last central directory header.
     */
    eocdOffset: number;
    /**
     * The size of te end-of-central-directory record
     */
    eocdSize: number;
}