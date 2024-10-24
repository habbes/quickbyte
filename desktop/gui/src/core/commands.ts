import { invoke } from "@tauri-apps/api";
import * as os from "@tauri-apps/api/os";
import type { SharedLinkDownloadRequest, LegacyTransferLinkDownloadRequest, UploadFilesRequest, FileSizeResponseItem, CancelTransferFileRequest, CancelTransferRequest, GoogleTokenResult, AppInfo, OsInfo } from "./types.js";

export function requestTransfers() {
    return invoke('request_transfers');
}

export function downloadSharedLink(downloadLinkRequest: SharedLinkDownloadRequest) {
    return invoke('download_shared_link', { request: downloadLinkRequest });
}

export function downloadLegacyTransferLink(downloadLinkRequest: LegacyTransferLinkDownloadRequest) {
    return invoke("download_legacy_transfer_link", { request: downloadLinkRequest });
}

export function deleteTransfer(localTransferId: string) {
    return invoke("delete_transfer", { id: localTransferId });
}

export function cancelTransfer(request: CancelTransferRequest) {
    return invoke("cancel_transfer", { request });
}

export function cancelTranferFile(request: CancelTransferFileRequest) {
    return invoke("cancel_transfer_file", { request });
}

export function uploadFiles(uploadRequest: UploadFilesRequest) {
    return invoke("upload_files", { request: uploadRequest });
}

export function getFileSizes(files: string[]): Promise<FileSizeResponseItem[]> {
    return invoke("get_file_sizes", { files: files });
}

export function showPathInFileManager(path: string): Promise<void> {
    return invoke("show_path_in_file_manager", { path });
}

export function loginWithGoogle(): Promise<GoogleTokenResult> {
    return invoke("sign_in_with_google");
}

export function tryLoadPersistedUserToken(): Promise<string|undefined|null> {
    return invoke("try_get_user_token");
}

export function persistUserToken(token: string): Promise<void> {
    return invoke("set_user_token", { token });
}

export function deletePersistedUserToken(): Promise<void> {
    return invoke("delete_user_token");
}

export function getAppInfo(): Promise<AppInfo> {
    return invoke("get_app_info")
}

export async function getOsInfo(): Promise<OsInfo> {
    const [platform, type, arch, version] = await Promise.all([
        os.platform(),
        os.type(),
        os.arch(),
        os.version()
    ]);

    return {
        platform,
        type,
        arch,
        version
    };
}