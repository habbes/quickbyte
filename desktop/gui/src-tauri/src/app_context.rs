use std::sync::Arc;
use tokio;

use crate::auth::auth_store::AuthStore;
use crate::core::models::AppInfo;
use crate::core::request::Request;
use crate::core::{event::Event, transfer_manager::TransferManager};
use crate::core::message_channel::{MessageChannel, SyncMessageChannel};
use crate::persistence::database::Database;

pub struct AppContext {
  pub requests: MessageChannel<Request>,
  pub config: AppInfo,
  pub auth_store: AuthStore,
}

impl AppContext {
  pub async fn init(db_path: String, config: AppInfo, event_handler: impl Fn(Event) + Send + 'static) -> Self {
    println!("Init app with db_path {db_path}");
    let saved_jobs;
    let database = {
      let mut database = Database::init(&db_path);
      saved_jobs = database.load_transfers();
      // let database = Arc::new(std::sync::Mutex::new(database));
      Arc::new(std::sync::Mutex::new(database))
    };

    let db_sync_channel = Arc::new(SyncMessageChannel::new( move|message| {
      match message {
        Event::TransferCreated(transfer) => database.lock().unwrap().create_transfer(&transfer),
        Event::TransferStatusUpdate {
          transfer_id,
          status,
          error
        } => database.lock().unwrap().update_transfer_status(&transfer_id, &status, error.as_deref()),
        Event::TransferFileStatusUpdate {
          file_id,
          transfer_id,
          status,
          error
        } => database.lock().unwrap().update_file_status(&file_id,  &status, error.as_deref()),
        Event::TransferFileBlockStatusUpdate {
          block_id,
          file_id,
          status,
          error } => database.lock().unwrap().update_block_status(&block_id, &file_id, &status),
        Event::TransferDeleted {
          transfer_id
        } => database.lock().unwrap().delete_transfer(&transfer_id),
        _ => (),
      };
    }));

    let events = MessageChannel::new(move |event| {
      event_handler(event);
      std::future::ready(())
    });

    let transfers = Arc::new(TransferManager::new( events.clone(), db_sync_channel.clone()));

    let requests = MessageChannel::new(move|request| {
      let transfers = transfers.clone();
      // spawn a task for each request to handle requests concurrently
      async move {
        tokio::spawn(async move {
          transfers.execute_request(request).await;
        }).await;
      }
    });
    
    for job in saved_jobs {
      requests.send(Request::ResumeTransfer(job)).await;
    }
    
    Self {
      requests,
      auth_store: AuthStore::init(&config.name),
      config,
    }
  }
}
