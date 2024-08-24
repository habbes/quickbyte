import { GlobalEventListener } from "@/core";
import type { Store } from "./store.js";

function initGlobalEventListener(store: Store) {
    const listener = new GlobalEventListener({
        onTransferCreated(transfer) {
            console.log('transfer created', transfer);
            store.addTransfer(transfer);
        },
        onTransfers(transfers) {
            console.log('transfers', transfers);
            store.setTransfers(transfers)
        }
    });

    return listener;
}

export { initGlobalEventListener };