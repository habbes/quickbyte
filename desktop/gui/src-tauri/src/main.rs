// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod core;
pub mod commands;
pub mod event_bridge;
pub mod persistence;
pub mod schema;
mod app_context;

use tauri::Manager;
use commands::*;
use event_bridge::bridge_events;
use app_context::AppContext;
use directories::BaseDirs;

#[tokio::main]
async fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let app_handle = app.handle();
      let app_context = AppContext::init(get_db_path().as_str(), move |event| {
        bridge_events(&app_handle, event)
      });
      
      app.manage(app_context);

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      download_shared_link,
      upload_files,
      request_transfers,
      get_file_sizes
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn get_db_path() -> String {
  let base_dirs = BaseDirs::new().expect("Could not get app directories");
  let base_data_path = base_dirs.data_local_dir();
  let base_data_path = base_data_path.join(std::path::Path::new("quickbyte"));
  let base_data_path =  base_data_path.to_str().unwrap().to_string();
  let db_path = base_data_path + "/data.db";
  return String::from(db_path);
}
