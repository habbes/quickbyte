import { invoke } from "@tauri-apps/api";
import type { SharedLinkDownloadRequest, LegacyTransferLinkDownloadRequest, UploadFilesRequest, FileSizeResponseItem } from "./types.js";

export function requestTransfers() {
    return invoke('request_transfers');
}

export function downloadSharedLink(downloadLinkRequest: SharedLinkDownloadRequest) {
    return invoke('download_shared_link', { request: downloadLinkRequest });
}

export function downloadLegacyTransferLink(downloadLinkRequest: LegacyTransferLinkDownloadRequest) {
    return invoke("download_legacy_transfer_link", { request: downloadLinkRequest });
}

export function uploadFiles(uploadRequest: UploadFilesRequest) {
    return invoke("upload_files", { request: uploadRequest });
}

export function getFileSizes(files: string[]): Promise<FileSizeResponseItem[]> {
    return invoke("get_file_sizes", { files: files });
}

export function loginWithGoogle(): Promise<any> {
    return invoke("sign_in_with_google");
}

export function tryGetUserToken(): Promise<string|undefined> {
    return invoke("try_get_user_token");
}

export function setUserToken(token: string): Promise<void> {
    return invoke("set_user_token", { token });
}