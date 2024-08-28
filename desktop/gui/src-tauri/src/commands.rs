use tauri::{command, State};
use crate::core::request::Request;
use crate::core::dtos::*;
use crate::app_context::AppContext;

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


#[derive(serde::Serialize, serde::Deserialize)]
pub struct GetFileSizeResponse {
  path: String,
  name: String,
  size: u64
}
