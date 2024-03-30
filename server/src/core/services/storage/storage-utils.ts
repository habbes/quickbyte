import { createAppError } from "../../error.js";
import { IStorageHandler } from "./types.js";
import { getBlobName, getFileName, TransferFile } from "@quickbyte/common";

export async function getDownloadUrl(handler: IStorageHandler, file: TransferFile, expirtyDate: Date) {
    if (!file.accountId) {
        throw createAppError(`The provided file does not have an accountId. Account Id is required when generating download url.`);
    }

    const downloadUrl = await handler.getBlobDownloadUrl(file.region, file.accountId, getBlobName(file), expirtyDate, getFileName(file))
    return downloadUrl;
}