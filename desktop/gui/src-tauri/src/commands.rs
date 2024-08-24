use tauri::{command, State};
use crate::core::request::Request;
use crate::core::dtos::SharedLinkDownloadRequest;
use crate::core::app_context::AppContext;

#[command]
pub fn send_download_share_link_request(context: State<AppContext>, request: SharedLinkDownloadRequest) {
    context.requests.send(Request::DownloadSharedLink(request));
}

#[command]
pub fn send_get_transfers_request(context: State<AppContext>) {
    context.requests.send(Request::GetTransfers);
}