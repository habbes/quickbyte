import { invoke } from "@tauri-apps/api";
import type { SharedLinkDownloadRequest, UploadFilesRequest } from "./types.js";

export function requestTransfers() {
    return invoke('request_transfers');
}

export function downloadSharedLink(downloadLinkRequest: SharedLinkDownloadRequest) {
    return invoke('download_shared_link', { request: downloadLinkRequest });
}

export function uploadFiles(uploadRequest: UploadFilesRequest) {
    return invoke("upload_files", { request: uploadRequest });
}