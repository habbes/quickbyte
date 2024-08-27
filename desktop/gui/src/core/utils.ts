import { TransferJob } from "./types";

export function getTransferCompletedSize(transfer: TransferJob) {
    if (transfer.type === 'download') {
        return transfer.files.reduce((sizeSoFar, file) => sizeSoFar + file.completedSize, 0);
    }

    return 0;
}