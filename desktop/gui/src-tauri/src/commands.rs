use tauri::{command, State};
use crate::core::request::Request;
use crate::core::dtos::SharedLinkDownloadRequest;
use crate::core::app_context::AppContext;

#[command]
pub fn download_shared_link(context: State<AppContext>, request: SharedLinkDownloadRequest) {
    println!("Shared link download command received.");
    context.requests.send(Request::DownloadSharedLink(request));
}

#[command]
pub fn request_transfers(context: State<AppContext>) {
    println!("Request transfers command issued");
    context.requests.send(Request::GetTransfers);
}