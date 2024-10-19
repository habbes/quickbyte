// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod core;
pub mod commands;
pub mod event_bridge;
pub mod persistence;
pub mod schema;
pub mod auth;
mod app_context;

use core::models::AppInfo;

use tauri::Manager;
use commands::*;
use event_bridge::bridge_events;
use app_context::AppContext;
use directories::BaseDirs;
use tokio;
use tauri_plugin_context_menu;
use dotenvy::dotenv;

#[tokio::main]
async fn main() {
  dotenv().ok();
  tauri::Builder::default()
    .plugin(tauri_plugin_context_menu::init())
    .setup(|app| {
      let app_handle = app.handle();

      let config = app_handle.config();
      println!("Binary name {:?}", config.package.binary_name());
      let package = &config.package;
      let app_config = AppInfo {
        name: package.product_name.clone().expect("Failed to get app product name"),
        version: package.version.clone().expect("Failed to get app version"),
        server_base_url: std::env::var("SERVER_BASE_URL").expect("Failed to get SERVER_BASE_URL")
      };

      // TODO: since this runs async, the UI might start before the app context
      // has been initialized, which means commands won't work. Be sure to synchronize things
      // to make sure that doesn't happen.
      tokio::spawn(async move {
        let cloned_handle = app_handle.clone();
        let app_context = AppContext::init(get_db_path().to_string(), app_config, move |event| {
          bridge_events(&cloned_handle, event)
        }).await;

        app_handle.manage(app_context);
        println!("App initialization complete.");
      });
      
      // app.manage(app_context);

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_app_info,
      download_shared_link,
      download_legacy_transfer_link,
      upload_files,
      request_transfers,
      delete_transfer,
      cancel_transfer,
      cancel_transfer_file,
      get_file_sizes,
      show_path_in_file_manager,
      sign_in_with_google,
      try_get_user_token,
      set_user_token,
      delete_user_token
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn get_db_path() -> String {
  let base_dirs = BaseDirs::new().expect("Could not get app directories");
  let base_data_path = base_dirs.data_local_dir();
  let base_data_path = base_data_path.join(std::path::Path::new("Quickbyte"));
  let base_data_path =  base_data_path.to_str().unwrap().to_string();
  let db_path = base_data_path + "/data.db";
  return String::from(db_path);
}
