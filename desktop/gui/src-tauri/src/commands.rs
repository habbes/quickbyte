use tauri::{command, State};
use crate::core::request::Request;
use crate::core::dtos::*;
use crate::core::app_context::AppContext;

#[command]
pub async fn download_shared_link(context: State<'_, AppContext>, request: SharedLinkDownloadRequest) -> Result<(), ()>{
    println!("Shared link download command received.");
    context.requests.send(Request::DownloadSharedLink(request)).await;
    Ok(())
}

#[command]
pub async fn upload_files(context: State<'_, AppContext>, request: UploadFilesRequest) -> Result<(), ()>{
    println!("Upload files command received.");
    context.requests.send(Request::UploadFiles(request)).await;
    Ok(())
}

#[command]
pub async fn request_transfers(context: State<'_, AppContext>) -> Result<(), ()> {
    println!("Request transfers command issued");
    context.requests.send(Request::GetTransfers).await;
    Ok(())
}
