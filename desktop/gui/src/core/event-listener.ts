import { listen } from '@tauri-apps/api/event';
import type { TransferJob } from "./types.js";

export class GlobalEventListener {
    constructor(private handlers: GlobalEventHandler) {
    }

    listen() {
        listen('transfers', event => this.handlers.onTransfers(event.payload as TransferJob[]));
        listen('transfer_created', event => this.handlers.onTransferCreated(event.payload as TransferJob));
    }
}

export interface GlobalEventHandler {
    onTransfers(transfers: TransferJob[]): unknown;
    onTransferCreated(transferCreated: TransferJob): unknown;
}