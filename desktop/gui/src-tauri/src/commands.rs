use tauri::{command, State};
use crate::core::request::Request;
use crate::core::dtos::SharedLinkDownloadRequest;
use crate::core::app_context::AppContext;

#[command]
pub async fn download_shared_link(context: State<'_, AppContext>, request: SharedLinkDownloadRequest) -> Result<(), ()>{
    println!("Shared link download command received.");
    context.requests.send(Request::DownloadSharedLink(request)).await;
    Ok(())
}

#[command]
pub async fn request_transfers(context: State<'_, AppContext>) -> Result<(), ()> {
    println!("Request transfers command issued");
    context.requests.send(Request::GetTransfers).await;
    Ok(())
}
