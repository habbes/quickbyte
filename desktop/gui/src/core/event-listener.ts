import { listen } from '@tauri-apps/api/event';
import type { TransferJob } from "./types.js";

export class GlobalEventListener {
    constructor(private handlers: GlobalEventHandler) {
    }

    listen() {
        listen('transfers', event => this.handlers.onTransfers(event.payload as TransferJob[]));
        listen('transfer_created', event => this.handlers.onTransferCreated(event.payload as TransferJob));
        listen('transfer_deleted', event => this.handlers.onTransferDeleted(event.payload as string));
        listen('transfer_completed', event => this.handlers.onTransferCompleted(event.payload as TransferJob));
        listen('transfer_file_upload_completed', event => this.handlers.onTransferFileUploadCompleted(event.payload as TransferFileCompletedEvent));
    }
}

export interface GlobalEventHandler {
    onTransfers(transfers: TransferJob[]): unknown;
    onTransferCreated(transferCreated: TransferJob): unknown;
    onTransferDeleted(transferId: string): unknown;
    onTransferCompleted(transferCompleted: TransferJob): unknown;
    onTransferFileUploadCompleted(fileCompleted: TransferFileCompletedEvent): unknown;
}

export interface TransferCompletedEvent {
    transferId: string;
    duration: number
}

export interface TransferFileCompletedEvent {
    transferId: string;
    fileId: string;
}