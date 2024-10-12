import { GlobalEventListener, TrpcApiClient } from "@/core";
import type { Store } from "./store.js";
import { ensure } from "@quickbyte/common";

function initGlobalEventListener(store: Store, apiClient: TrpcApiClient) {
    const listener = new GlobalEventListener({
        onTransferCreated(transfer) {
            console.log('transfer created', transfer);
            store.addTransfer(transfer);
        },
        onTransfers(transfers) {
            console.log('transfers', transfers);
            store.setTransfers(transfers)
        },
        onTransferDeleted(transferId) {
            store.deleteTransfer(transferId);
        },
        async onTransferCompleted(transfer) {
            if (transfer.type !== 'upload') return;

            await apiClient.finalizeTransfer.mutate({
                transferId: ensure(transfer.uploadTransferId, 'Expected upload transfer id to be set.'),
                duration: 1, // TODO set duration, also track recovered transfer
            });
        },
        async onTransferFileUploadCompleted({ transferId, fileId }) {
            await apiClient.completeTransferFileUpload.mutate({
                transferId,
                fileId
            });
        }
    });

    listener.listen();

    return listener;
}

export { initGlobalEventListener };