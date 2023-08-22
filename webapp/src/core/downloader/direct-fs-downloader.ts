import { type DownloadRequestResult } from "../api-client.js";
import { type ZipDownloader } from "./types.js";
import { ensure } from '../util.js';
import { BlockBlobClient } from "@azure/storage-blob";

// See ZIP file format: https://en.wikipedia.org/wiki/ZIP_(file_format)

// The size of the local file header before the name
const LOCAL_HEADER_BASE_SIZE = 30;
const CENTRAL_HEADER_BASE_SIZE = 46;
const BLOCK_SIZE = 16 * 1024 * 1024;


export class DirectFileSystemZipDownloader implements ZipDownloader {
    async download(transfer: DownloadRequestResult): Promise<void> {
        console.log('using direct-fs');

        // calculate local header length and offsets for each file
        const zipEntries = generateZipEntryData(transfer.files);

        // @ts-ignore
        const handle: FileSystemFileHandle = await window.showSaveFilePicker({ suggestedName: `${transfer.name}.zip`});

        const writable = await handle.createWritable();
        await writable.write({ position: 10, data: "test", type: 'write' });
        
        for (let file of transfer.files) {
            const downloader = new FileDownloader(writable, file, ensure(zipEntries.entries.get(file._id)), BLOCK_SIZE);
        }

        await writable.close();
    }
}

class FileDownloader {
    private client: BlockBlobClient;
    constructor(private writer: FileSystemWritableFileStream, private file: DownloadRequestResult["files"][0], private zipEntry: ZipFileEntry, blockSize: number) {
        this.client = new BlockBlobClient(file.downloadUrl);
    }

    async download(): Promise<void> {

    }
}

async function writeLocalHeader(writer: FileSystemWritableFileStream, entry: ZipFileEntry) {
    const headerData = new Uint8Array(entry.localHeaderTotalSize);
    const dataView = new DataView(headerData.buffer);
    
    // off: 0, 4 bytes: Local file header signature = 0x04034b50 (PK♥♦ or "PK\3\4")
    const offset = entry.localHeaderOffset;
    dataView.setUint32(offset + 0, 0x04034b50, true);
    // skip offset 4 to 13 (version, general purpose bit flag, compression method, last mod time, last mod date)
    
    // CRC-32 of uncompressed data
    // TODO: calculate chksum separately as file is being downloaded
    // and update when file is complete
    // const chksum = crc32(fileData); // 
    // dataView.setUint32(14, chksum, true);
    // Compressed size
    dataView.setUint32(offset + 18, entry.size, true);
    // Uncompressied size
    dataView.setUint32(offset + 22, entry.size, true);
    // File name length
    dataView.setUint16(offset + 26, entry.encodedName.length, true);
    // Extra field length
    dataView.setUint16(offset + 28, 0, true);
    // File name
    headerData.set(entry.encodedName, offset + 30);
  
    // write header
    await writer.write(headerData);
}

function generateZipEntryData(files: DownloadRequestResult['files']): ZipEntryInfo {
    const zipEntries = new Map<string, ZipFileEntry>();
    const encoder = new TextEncoder();
    let currentOffset = 0;
    for (let file of files) {
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
        };

        zipEntries.set(entry.id, entry);

        // next file header will be header size + data size
        currentOffset += entry.localHeaderTotalSize + entry.size;
    }

    // the currentOffset is now the beginning of the central directory
    const centralDirOffset = currentOffset;
    
    // we execute a second pass to compute the central header offset for each file
    for (let file of files) {
        const entry = ensure(zipEntries.get(file._id));
        entry.centralHeaderOffset = currentOffset;
        currentOffset += entry.centralHeaderTotalSize;
    }

    const eocdEntry: EndOfCentralDirEntry = {
        numEntries: files.length,
        centralDirOffset,
        centralDirSize: currentOffset
    };

    return { entries: zipEntries, eocd: eocdEntry };
}


interface ZipEntryInfo {
    entries: Map<string, ZipFileEntry>;
    eocd: EndOfCentralDirEntry;
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
}

interface EndOfCentralDirEntry {
    numEntries: number;
    centralDirSize: number;
    centralDirOffset: number;
}