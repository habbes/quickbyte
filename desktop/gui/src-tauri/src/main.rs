// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Serialize, Deserialize};


use azure_core::error::{ErrorKind, ResultExt};
use azure_storage::prelude::*;
use azure_storage_blobs::{blob::operations::GetBlobBuilder, prelude::*};
use futures::stream::StreamExt;
use tokio::task;

use std::fs::File;
use std::io::prelude::*;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct ShareDownloadFile {
  #[serde(rename = "_id")] // The camel case rename removes even leading _
  _id: String,
  transfer_id: String,
  name: String,
  size: i64,
  account_id: String,
  download_url: String,
  #[serde(rename = "_createdAt")]
  _created_at: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
  format!("Hello, {}!", name)
}

#[tauri::command]
async fn download_share(files: Vec<ShareDownloadFile>) {
    println!("Results received.");
    println!("What {:?}", files);

    let total_size: i64 = files.iter().map(|f| f.size).sum();
    let num_files = files.len();

    println!("Num files {:?} Total size {:?} bytes", num_files, total_size);

    // Create a vector of join handles
    let mut tasks = Vec::with_capacity(files.len());
    for file in files {
        let task = task::spawn(async move {
            // Call `az_download_file` and handle errors within the task
            if let Err(e) = az_download_file(&file).await {
                eprintln!("Error downloading file {:?}: {:?}", file, e);
            }
        });
        tasks.push(task);
    }

    // Await all tasks concurrently
    for task in tasks {
        if let Err(e) = task.await {
            eprintln!("Error awaiting task: {:?}", e);
        }
    }
}

async fn az_download_file(file: &ShareDownloadFile) -> Result<(), Box<dyn std::error::Error>> {
  let url = url::Url::parse(&file.download_url)?;
  let client = BlobClient::from_sas_url(&url).unwrap();
  let mut stream = client.get().into_stream();

  let parts: Vec<&str> = file.name.split('/').collect();
  let name = parts[parts.len() - 1];

  let some_path = "/Users/habbes/todel";
  println!("Writing file {:?}", name);
  let mut file = File::create(Path::new(some_path).join(name)).unwrap();
  while let Some(value) = stream.next().await {
    let mut body = value.unwrap().data;

    while let Some(value) = body.next().await {
      let value = value?; // Map the error here

      file.write_all(&value)?; // Borrow value and map error
    }
  }

  file.sync_all().map_err(|e| azure_core::Error::from(e))?; // Map the error here

  println!("Completed writing file {:?}", name);
  Ok(())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![greet])
    .invoke_handler(tauri::generate_handler![download_share])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
