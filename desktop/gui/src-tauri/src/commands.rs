use tauri::{command, State};
use crate::core::request::{DownloadFilesRequest, Request};
use crate::core::dtos::*;
use crate::app_context::AppContext;
use crate::auth::google_auth;
use crate::auth::auth_store;

#[command]
pub async fn download_shared_link(context: State<'_, AppContext>, request: SharedLinkDownloadRequest) -> Result<(), ()>{
    println!("Shared link download command received.");
    context.requests.send(Request::DownloadFiles(DownloadFilesRequest::FromSharedLink(request))).await;
    Ok(())
}

#[command]
pub async fn download_legacy_transfer_link(context: State<'_, AppContext>, request: LegacyTransferLinkDownloadRequest) -> Result<(), ()> {
    println!("Legacy transfer link download command received.");
    context.requests.send(Request::DownloadFiles(DownloadFilesRequest::FromLegacyTransferLink(request))).await;
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

#[command]
pub async fn get_file_sizes(files: Vec<String>) -> Result<Vec<GetFileSizeResponse>, ()> {
    println!("Fetching file sizes");
    let mut result = Vec::with_capacity(files.len());
    // TODO: get the file sizes concurrently
    for f in files {
        let metadata = tokio::fs::metadata(&f).await.unwrap();
        let name = std::path::Path::new(&f).file_name().unwrap();

        result.push(GetFileSizeResponse {
            path: f.clone(),
            name: String::from(name.to_str().unwrap()),
            size: metadata.len()
        });
    }

    return Ok(result);
}

// Using a third-party package because Tauri "open" does not
// provide a way to open a folder with a specific file selected.
// This feature is useful to implement the "Reveal in Finder/Explorer"
// feature.
// See: https://github.com/tauri-apps/plugins-workspace/issues/999
#[command]
pub async fn show_path_in_file_manager(path: String) -> Result<(), ()> {
    showfile::show_path_in_file_manager(path);
    Ok(())
}

#[command]
pub async fn sign_in_with_google(handle: tauri::AppHandle) -> Result<(), ()> {
    google_auth::sign_in_with_google(handle).await;

    Ok(())
}

#[command]
pub fn try_get_user_token() -> Result<Option<String>, ()> {
    if let Some(token) = auth_store::try_get_user_token() {
        Ok(Some(token.token))
    } else {
        Ok(None)
    }
}

#[command]
pub fn set_user_token(token: String) -> Result<(), ()> {
    auth_store::set_user_token(&token);
    Ok(())
}

#[command]
pub fn delete_user_token() -> Result<(), ()> {
    auth_store::delete_user_token();
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct GetFileSizeResponse {
  path: String,
  name: String,
  size: u64
}
