import { invoke } from "@tauri-apps/api";
import type { SharedLinkDownloadRequest } from "./types.js";

export function requestTransfers() {
    return invoke('requestTransfers');
}

export function downloadSharedLink(downloadLinkRequest: SharedLinkDownloadRequest) {
    return invoke('downloadSharedLink', { request: downloadLinkRequest });
}