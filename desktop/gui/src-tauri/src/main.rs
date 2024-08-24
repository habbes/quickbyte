// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod core;
pub mod message_channel;
pub mod commands;
pub mod event_bridge;

use tauri::Manager;
use commands::{send_download_share_link_request};
use event_bridge::bridge_events;
use core::app_context::AppContext;

// #[derive(Serialize, Deserialize, Debug)]
// #[serde(rename_all = "camelCase")]
// struct ShareDownloadFile {
//   #[serde(rename = "_id")] // The camel case rename removes even leading _
//   _id: String,
//   transfer_id: String,
//   name: String,
//   size: i64,
//   account_id: String,
//   download_url: String,
//   #[serde(rename = "_createdAt")]
//   _created_at: String,
// }

// #[tauri::command]
// fn greet(name: &str) -> String {
//   format!("Hello, {}!", name)
// }

// #[tauri::command]
// async fn download_share(files: Vec<ShareDownloadFile>) {
//     println!("Results received.");
//     println!("What {:?}", files);

//     let total_size: i64 = files.iter().map(|f| f.size).sum();
//     let num_files = files.len();

//     println!("Num files {:?} Total size {:?} bytes", num_files, total_size);

//     // Create a vector of join handles
//     let mut tasks = Vec::with_capacity(files.len());
//     for file in files {
//         let task = task::spawn(async move {
//             // Call `az_download_file` and handle errors within the task
//             if let Err(e) = az_download_file(&file).await {
//                 eprintln!("Error downloading file {:?}: {:?}", file, e);
//             }
//         });
//         tasks.push(task);
//     }

//     // Await all tasks concurrently
//     for task in tasks {
//         if let Err(e) = task.await {
//             eprintln!("Error awaiting task: {:?}", e);
//         }
//     }
// }

// #[tauri::command]
// async fn download_shared_link(link_request: SharedLinkDownloadRequest) {
//   let downloader = SharedLinkDownloader::new(&link_request);
//   downloader.start_download().await;
// }

// #[derive(serde::Serialize, serde::Deserialize)]
// struct GetFileSizeResponse {
//   path: String,
//   name: String,
//   size: u64
// }

// #[tauri::command]
// async fn get_file_sizes(files: Vec<String>) -> Vec<GetFileSizeResponse> {
//   println!("Fetching file sizes");
//   files.iter().map(|f| {
//     let metadata = std::fs::metadata(f).unwrap();
//     let name = Path::new(f).file_name().unwrap();

//     GetFileSizeResponse {
//       path: f.clone(),
//       name: String::from(name.to_str().unwrap()),
//       size: metadata.len()
//     }
//   }).collect()
// }

// #[tauri::command]
// async fn upload_files(request: UploadFilesRequest) {
//   let uploader = TransferUploader::new(&request);
//   uploader.start_upload().await;
// }

// async fn az_download_file(file: &ShareDownloadFile) -> Result<(), Box<dyn std::error::Error>> {
//   let url = url::Url::parse(&file.download_url)?;
//   let client = BlobClient::from_sas_url(&url).unwrap();
//   let mut stream = client.get().into_stream();

//   let parts: Vec<&str> = file.name.split('/').collect();
//   let name = parts[parts.len() - 1];

//   let some_path = "/Users/habbes/todel";
//   println!("Writing file {:?}", name);
//   let mut file = File::create(Path::new(some_path).join(name)).unwrap();
//   while let Some(value) = stream.next().await {
//     let mut body = value.unwrap().data;

//     while let Some(value) = body.next().await {
//       let value = value?; // Map the error here

//       file.write_all(&value)?; // Borrow value and map error
//     }
//   }

//   file.sync_all().map_err(|e| azure_core::Error::from(e))?; // Map the error here

//   println!("Completed writing file {:?}", name);
//   Ok(())
// }

// fn main() {
//   tauri::Builder::default()
//     .invoke_handler(tauri::generate_handler![
//       greet,
//       download_share,
//       download_shared_link,
//       get_file_sizes,
//       upload_files
//     ])
//     .run(tauri::generate_context!())
//     .expect("error while running tauri application");
// }

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let app_handle = app.handle();
      let app_context = AppContext::new(move |event| {
        bridge_events(&app_handle, event)
      });
      
      app.manage(app_context);

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      send_download_share_link_request
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
  
